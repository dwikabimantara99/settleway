import type { DbDeal, DbEscrowEvent } from '@/lib/db/types';
import { createEvent } from '@/lib/escrow/events';
import { lockAfterCustody } from '@/lib/escrow/state-machine';
import type { IRepository } from '@/lib/repositories';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeAtomicCustodySweep } from '@/lib/stellar/testnet-custody';
import type { DealRoomTestnetRuntimeResult } from '@/lib/stellar/server/deal-room-testnet-runtime';

interface CustodySweepExecutionResult {
  transactionHash: string;
  custodyAddress: string;
  buyerAmountXlm: string;
  sellerAmountXlm: string;
  assetCode: string;
}

export type CustodySweepCompletionResult =
  | {
      ok: true;
      deal: DbDeal;
      transactionHash: string;
      reusedExistingProof: boolean;
    }
  | {
      ok: false;
      deal: DbDeal;
      reason: 'runtime_unavailable' | 'execution_failed' | 'persistence_conflict';
      message: string;
    };

function findConfirmedCustodyEvent(events: DbEscrowEvent[]): DbEscrowEvent | null {
  return events.find(
    (event) => event.event_type === 'custody_transfer_confirmed' && event.tx_hash,
  ) ?? null;
}

async function persistLockedState(input: {
  repository: IRepository;
  deal: DbDeal;
  actorId: string;
  transactionHash: string;
  allowDemoRecoveryFallback: boolean;
}) {
  const lockedDeal: DbDeal = {
    ...lockAfterCustody(input.deal),
    latest_stellar_tx_hash: input.transactionHash,
    stellar_sync_status: 'idle',
  };
  const replaced = await input.repository.replaceDealIfCurrent({
    current: input.deal,
    next: lockedDeal,
  });

  if (!replaced.replaced) {
    const current = await input.repository.getDeal(input.deal.id);
    if (current?.status === 'LOCKED' && current.latest_stellar_tx_hash === input.transactionHash) {
      return current;
    }
    if (
      input.allowDemoRecoveryFallback &&
      current &&
      JSON.stringify(current) === JSON.stringify(input.deal)
    ) {
      await input.repository.updateDeal(input.deal.id, {
        status: lockedDeal.status,
        latest_stellar_tx_hash: lockedDeal.latest_stellar_tx_hash,
        stellar_sync_status: lockedDeal.stellar_sync_status,
        updated_at: lockedDeal.updated_at,
      });
      const recovered = await input.repository.getDeal(input.deal.id);
      if (recovered?.status === 'LOCKED' && recovered.latest_stellar_tx_hash === input.transactionHash) {
        return recovered;
      }
    }
    return null;
  }

  const events = await input.repository.getDealEvents(input.deal.id);
  if (!events.some((event) => event.event_type === 'escrow_locked' && event.tx_hash === input.transactionHash)) {
    const lockEvent = createEvent(
      input.deal.id,
      'escrow_locked',
      input.actorId,
      'Both managed profile wallet commitments were atomically transferred into Settleway custody on Stellar Testnet.',
      {
        next_status: 'LOCKED',
        funding_route: 'managed_profile_wallets_to_settleway_custody',
        asset_code: 'XLM',
      },
    );
    lockEvent.tx_hash = input.transactionHash;
    await input.repository.addEvent(lockEvent);
  }

  return lockedDeal;
}

export async function completeCustodySweep(input: {
  repository: IRepository;
  deal: DbDeal;
  actorId: string;
  loadRuntime?: () => DealRoomTestnetRuntimeResult;
  executeSweep?: (input: {
    deal: DbDeal;
    signer: NonNullable<Extract<DealRoomTestnetRuntimeResult, { ok: true }>['runtime']['signer_port']>;
  }) => Promise<CustodySweepExecutionResult>;
  allowDemoRecoveryFallback?: boolean;
}): Promise<CustodySweepCompletionResult> {
  if (input.deal.status !== 'CUSTODY_PENDING') {
    return {
      ok: false,
      deal: input.deal,
      reason: 'execution_failed',
      message: 'Custody sweep is only available after both participant funding transfers are confirmed.',
    };
  }

  const existingEvents = await input.repository.getDealEvents(input.deal.id);
  const existingProof = findConfirmedCustodyEvent(existingEvents);
  if (existingProof?.tx_hash) {
    const lockedDeal = await persistLockedState({
      repository: input.repository,
      deal: input.deal,
      actorId: input.actorId,
      transactionHash: existingProof.tx_hash,
      allowDemoRecoveryFallback: input.allowDemoRecoveryFallback === true,
    });
    if (!lockedDeal) {
      return {
        ok: false,
        deal: input.deal,
        reason: 'persistence_conflict',
        message: 'Custody was confirmed, but the Deal Room state needs reconciliation.',
      };
    }
    return {
      ok: true,
      deal: lockedDeal,
      transactionHash: existingProof.tx_hash,
      reusedExistingProof: true,
    };
  }

  const runtime = (input.loadRuntime ?? loadDealRoomTestnetRuntime)();
  if (!runtime.ok) {
    return {
      ok: false,
      deal: input.deal,
      reason: 'runtime_unavailable',
      message: 'Both deposits are confirmed, but the managed custody signer runtime is not ready.',
    };
  }

  let sweep;
  try {
    sweep = await (input.executeSweep ?? executeAtomicCustodySweep)({
      deal: input.deal,
      signer: runtime.runtime.signer_port,
    });
  } catch {
    return {
      ok: false,
      deal: input.deal,
      reason: 'execution_failed',
      message: 'Both deposits remain in managed profile wallets because the custody transfer was not confirmed.',
    };
  }

  const custodyEvent = createEvent(
    input.deal.id,
    'custody_transfer_confirmed',
    input.actorId,
    'Buyer and seller commitments were transferred atomically into Settleway custody.',
    {
      custody_address: sweep.custodyAddress,
      buyer_amount_xlm: sweep.buyerAmountXlm,
      seller_amount_xlm: sweep.sellerAmountXlm,
      asset_code: sweep.assetCode,
      funding_route: 'managed_profile_wallets_to_settleway_custody',
    },
  );
  custodyEvent.tx_hash = sweep.transactionHash;
  await input.repository.addEvent(custodyEvent);

  const lockedDeal = await persistLockedState({
    repository: input.repository,
    deal: input.deal,
    actorId: input.actorId,
    transactionHash: sweep.transactionHash,
    allowDemoRecoveryFallback: input.allowDemoRecoveryFallback === true,
  });
  if (!lockedDeal) {
    return {
      ok: false,
      deal: input.deal,
      reason: 'persistence_conflict',
      message: 'Custody was confirmed, but the Deal Room state needs reconciliation.',
    };
  }

  return {
    ok: true,
    deal: lockedDeal,
    transactionHash: sweep.transactionHash,
    reusedExistingProof: false,
  };
}
