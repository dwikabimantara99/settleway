import type { DbDeal, DbEscrowEvent } from '@/lib/db/types';
import { createEvent } from '@/lib/escrow/events';
import type { IRepository } from '@/lib/repositories';
import { completeCustodySweep } from '@/lib/stellar/server/custody-sweep-service';
import {
  resolveFundingRole,
  resolveFundingTotalIdr,
  resolveSignedFundingTargetStatus,
  type SignedFundingAction,
} from '@/lib/stellar/testnet-funding';

type CustodySweep = typeof completeCustodySweep;

export interface ConfirmedFundingResult {
  deal: DbDeal;
  fundingTransactionHash: string;
  reusedFundingRecord: boolean;
  custodyStatus: 'not_required' | 'confirmed' | 'pending';
  custodyTransactionHash: string | null;
  custodyMessage: string | null;
}

function isFundingEvent(
  event: DbEscrowEvent,
  action: SignedFundingAction,
  transactionHash: string,
) {
  return event.event_type === action && event.tx_hash === transactionHash;
}

async function finishCustodyIfReady(input: {
  repository: IRepository;
  deal: DbDeal;
  actorId: string;
  completeSweep: CustodySweep;
  fundingTransactionHash: string;
  reusedFundingRecord: boolean;
  allowDemoRecoveryFallback?: boolean;
}): Promise<ConfirmedFundingResult> {
  if (input.deal.status !== 'CUSTODY_PENDING') {
    return {
      deal: input.deal,
      fundingTransactionHash: input.fundingTransactionHash,
      reusedFundingRecord: input.reusedFundingRecord,
      custodyStatus: input.deal.status === 'LOCKED' ? 'confirmed' : 'not_required',
      custodyTransactionHash: null,
      custodyMessage: null,
    };
  }

  const custodyResult = await input.completeSweep({
    repository: input.repository,
    deal: input.deal,
    actorId: input.actorId,
    allowDemoRecoveryFallback: input.allowDemoRecoveryFallback,
  });

  if (custodyResult.ok) {
    return {
      deal: custodyResult.deal,
      fundingTransactionHash: input.fundingTransactionHash,
      reusedFundingRecord: input.reusedFundingRecord,
      custodyStatus: 'confirmed',
      custodyTransactionHash: custodyResult.transactionHash,
      custodyMessage: null,
    };
  }

  return {
    deal: custodyResult.deal,
    fundingTransactionHash: input.fundingTransactionHash,
    reusedFundingRecord: input.reusedFundingRecord,
    custodyStatus: 'pending',
    custodyTransactionHash: null,
    custodyMessage: custodyResult.message,
  };
}

export async function recordConfirmedFunding(input: {
  repository: IRepository;
  dealId: string;
  action: SignedFundingAction;
  actorId: string;
  sourceAddress: string;
  transactionHash: string;
  completeSweep?: CustodySweep;
  allowDemoRecoveryFallback?: boolean;
}): Promise<ConfirmedFundingResult> {
  const completeSweep = input.completeSweep ?? completeCustodySweep;
  const current = await input.repository.getDeal(input.dealId);
  if (!current) throw new Error('Deal not found');

  const existingEvents = await input.repository.getDealEvents(input.dealId);
  const existingFundingEvent = existingEvents.find((event) =>
    isFundingEvent(event, input.action, input.transactionHash),
  );

  if (existingFundingEvent) {
    return finishCustodyIfReady({
      repository: input.repository,
      deal: current,
      actorId: input.actorId,
      completeSweep,
      fundingTransactionHash: input.transactionHash,
      reusedFundingRecord: true,
      allowDemoRecoveryFallback: input.allowDemoRecoveryFallback,
    });
  }

  let updatedDeal = current;
  let stateWasAlreadyApplied = false;

  if (
    current.status === 'CUSTODY_PENDING' &&
    current.latest_stellar_tx_hash === input.transactionHash
  ) {
    stateWasAlreadyApplied = true;
  } else {
    const targetStatus = resolveSignedFundingTargetStatus(current.status, input.action);
    const nextDeal: DbDeal = {
      ...current,
      status: targetStatus,
      latest_stellar_tx_hash: input.transactionHash,
      stellar_sync_status: 'idle',
      updated_at: new Date().toISOString(),
    };
    const replacement = await input.repository.replaceDealIfCurrent({
      current,
      next: nextDeal,
    });

    if (!replacement.replaced || !replacement.deal) {
      const refreshedDeal = await input.repository.getDeal(input.dealId);
      const refreshedEvents = await input.repository.getDealEvents(input.dealId);
      const wasRecordedConcurrently = refreshedEvents.some((event) =>
        isFundingEvent(event, input.action, input.transactionHash),
      );

      if (refreshedDeal && wasRecordedConcurrently) {
        return finishCustodyIfReady({
          repository: input.repository,
          deal: refreshedDeal,
          actorId: input.actorId,
          completeSweep,
          fundingTransactionHash: input.transactionHash,
          reusedFundingRecord: true,
          allowDemoRecoveryFallback: input.allowDemoRecoveryFallback,
        });
      }

      if (
        input.allowDemoRecoveryFallback === true &&
        refreshedDeal &&
        JSON.stringify(refreshedDeal) === JSON.stringify(current)
      ) {
        await input.repository.updateDeal(input.dealId, {
          status: nextDeal.status,
          latest_stellar_tx_hash: nextDeal.latest_stellar_tx_hash,
          stellar_sync_status: nextDeal.stellar_sync_status,
          updated_at: nextDeal.updated_at,
        });
        const recoveredDeal = await input.repository.getDeal(input.dealId);
        if (
          recoveredDeal?.status === nextDeal.status &&
          recoveredDeal.latest_stellar_tx_hash === input.transactionHash
        ) {
          updatedDeal = recoveredDeal;
          stateWasAlreadyApplied = true;
        } else {
          throw new Error('Confirmed Stellar funding could not be recovered in demo state.');
        }
      } else {
        throw new Error('Confirmed Stellar funding requires local state reconciliation.');
      }
    } else {
      updatedDeal = replacement.deal;
    }
  }

  const role = resolveFundingRole(input.action);
  const fundingEvent = createEvent(
    input.dealId,
    input.action,
    input.actorId,
    `${role === 'buyer' ? 'Buyer' : 'Seller'} funding was signed by the connected wallet and confirmed on Stellar Testnet.`,
    {
      participant_role: role,
      deposit_total_idr: resolveFundingTotalIdr(updatedDeal, role),
      next_status: updatedDeal.status,
      connected_wallet_address: input.sourceAddress,
      funding_route: 'external_wallet_to_managed_profile_wallet',
      reconciled_from_chain: stateWasAlreadyApplied,
    },
  );
  fundingEvent.tx_hash = input.transactionHash;
  await input.repository.addEvent(fundingEvent);

  if (updatedDeal.status === 'CUSTODY_PENDING') {
    const eventsAfterFunding = await input.repository.getDealEvents(input.dealId);
    if (!eventsAfterFunding.some((event) => event.event_type === 'custody_pending')) {
      const custodyEvent = createEvent(
        input.dealId,
        'custody_pending',
        input.actorId,
        'Both connected-wallet funding transactions are confirmed at the managed profile wallets. Custody transfer must complete before escrow can lock.',
        {
          next_status: updatedDeal.status,
          funding_route: 'managed_profile_wallets_to_custody_pending',
        },
      );
      custodyEvent.tx_hash = input.transactionHash;
      await input.repository.addEvent(custodyEvent);
    }
  }

  return finishCustodyIfReady({
    repository: input.repository,
    deal: updatedDeal,
    actorId: input.actorId,
    completeSweep,
    fundingTransactionHash: input.transactionHash,
    reusedFundingRecord: stateWasAlreadyApplied,
    allowDemoRecoveryFallback: input.allowDemoRecoveryFallback,
  });
}
