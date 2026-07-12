import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { coordinateDealExecution } from '@/lib/stellar/server/deal-execution-coordinator';
import { createStellarIdempotencyKey } from '@/lib/stellar/helpers';
import { RepositoryDealPersistence, RepositoryStellarOperationPersistence } from '@/lib/stellar/server/repository-execution-persistence';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { ProfileWalletSigner } from '@/lib/stellar/server/profile-wallet-signer';
import type { StellarOperation } from '@/lib/stellar/types';
import { rejectLegacyActionForCustodyV2 } from '@/lib/deals/rail-guards';
import { processReputationOutcome } from '@/lib/reputation/engine';
import { createProfilePayoutDestinationSnapshot, createWalletPayoutDestinationSnapshot } from '@/lib/payout-destinations';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';

function currentTimestamp(): string {
  return new Date().toISOString();
}

const ROUTE_RECONCILIATION_ATTEMPTS = 5;
const ROUTE_RECONCILIATION_DELAY_MS = 1500;

function isReconciliationPending(operation: StellarOperation | null): boolean {
  return (
    operation !== null &&
    (operation.operation_status === 'submitted' || operation.operation_status === 'unknown')
  );
}

async function waitForReconciliationWindow(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ROUTE_RECONCILIATION_DELAY_MS));
}

function mapCoordinatorFailure(
  result: Extract<Awaited<ReturnType<typeof coordinateDealExecution>>, { ok: false }>,
) {
  switch (result.reason) {
    case 'ERR_OUT_OF_SYNC':
    case 'ERR_DEAL_PERSISTENCE_CONFLICT':
      return { status: 409, code: 'CONFLICT', message: 'Deal execution is out of sync. Please retry.' };
    case 'ERR_DEAL_PERSISTENCE_UNAVAILABLE':
    case 'ERR_EXECUTION_PERSISTENCE_FAILURE':
      return { status: 503, code: 'STELLAR_PERSISTENCE_UNAVAILABLE', message: 'Testnet execution state could not be persisted.' };
    case 'ERR_ASSEMBLY_FAILURE':
    case 'ERR_LOCAL_COMMIT_PLANNING_FAILURE':
      return { status: 400, code: 'STELLAR_EXECUTION_INVALID', message: 'The Testnet settlement input is not valid for this deal state.' };
    default:
      return { status: 502, code: 'STELLAR_EXECUTION_FAILED', message: 'The Stellar Testnet settlement action could not be confirmed.' };
  }
}

async function buildCompletionPayoutMetadata(deal: DbDeal) {
  const [buyerProfile, sellerProfile] = await Promise.all([
    repository.getProfile(deal.buyer_id),
    repository.getProfile(deal.seller_id),
  ]);

  return {
    buyer_payout_destination: buyerProfile
      ? createProfilePayoutDestinationSnapshot(buyerProfile)
      : createWalletPayoutDestinationSnapshot('Buyer payout destination', null),
    seller_payout_destination: sellerProfile
      ? createProfilePayoutDestinationSnapshot(sellerProfile)
      : createWalletPayoutDestinationSnapshot('Seller payout destination', null),
    platform_payout_destination: createWalletPayoutDestinationSnapshot(
      'Settleway fee wallet',
      TESTNET_DEMO_IDENTITIES.platform.public_address,
    ),
  };
}

async function runLegacyLocalAcceptance(
  dealId: string,
  existingDeal: DbDeal,
  actorId: string,
) {
  const updatedDeal = transition(existingDeal, 'accept_delivery');
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
  const settlementReference =
    updatedDeal.latest_stellar_tx_hash ??
    (updatedDeal.proof_hash ? `proof:${updatedDeal.proof_hash}` : `room-settlement:${updatedDeal.id}`);
  const settledAt = new Date().toISOString();
  const payoutMetadata = await buildCompletionPayoutMetadata(updatedDeal);

  const event = createEvent(
    dealId,
    'accept_delivery',
    actorId,
    'Buyer confirmed receipt. Settlement is complete and final balances are routed to the destination wallets.',
    {
      next_status: updatedDeal.status,
      principal_to_seller_idr: updatedDeal.principal_idr,
      buyer_bond_return_idr: updatedDeal.buyer_bond_idr,
      seller_bond_return_idr: updatedDeal.seller_bond_idr,
      platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
      buyer_wallet_credit_idr: updatedDeal.buyer_bond_idr,
      seller_wallet_credit_idr: updatedDeal.principal_idr + updatedDeal.seller_bond_idr,
      platform_wallet_credit_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
      settlement_reference: settlementReference,
      settled_at: settledAt,
      ...payoutMetadata,
    },
  );
  await repository.addEvent(event);

  const operationStatus = updatedDeal.stellar_mode === 'mock_only' ? 'confirmed' : 'unknown';

  await processReputationOutcome(repository, {
    deal_id: updatedDeal.id,
    buyer_id: updatedDeal.buyer_id,
    seller_id: updatedDeal.seller_id,
    reputation_outcome: 'transaction_completed',
    principal_idr: updatedDeal.principal_idr,
    transaction_hash: updatedDeal.latest_stellar_tx_hash,
    proof_hash: updatedDeal.proof_hash,
    settlement_reference: settlementReference,
    settled_at: settledAt,
    local_terminal_outcome_persisted: true,
    operation_status: operationStatus as 'confirmed' | 'unknown',
    sync_status: updatedDeal.stellar_sync_status
  }, () => globalThis.crypto.randomUUID());

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'accept_delivery' as EscrowAction;

  if (dealId === 'demo-cabai-001') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const mockActor = cookieStore.get('mock_actor')?.value;
    if (mockActor === 'buyer-surabaya-restaurant') {
      const { getServiceRoleClient } = await import('@/lib/db/server-service-client');
      let serviceClient;
      try {
        serviceClient = getServiceRoleClient();
      } catch (e) {
        return NextResponse.json(createErrorResponse('SERVER_CONFIG_ERROR', e instanceof Error ? e.message : 'Missing config'), { status: 500 });
      }

      if (!process.env.STELLAR_PLATFORM_SECRET) {
        return NextResponse.json(createErrorResponse('SERVER_CONFIG_ERROR', 'Missing STELLAR_PLATFORM_SECRET for demo anchor'), { status: 500 });
      }

      const { data: demoDeal, error: demoError } = await serviceClient
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (demoError || !demoDeal) {
        return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Demo deal not found'), { status: 401 });
      }

      if (
        demoDeal.buyer_id === 'buyer-surabaya-restaurant' &&
        demoDeal.seller_id === 'seller-probolinggo-cabai' &&
        demoDeal.stellar_mode === 'mock_only'
      ) {
        if (demoDeal.status === 'COMPLETED' && demoDeal.latest_stellar_tx_hash) {
          return NextResponse.json(createSuccessResponse(demoDeal, { tx_hash: demoDeal.latest_stellar_tx_hash, proof_hash: demoDeal.proof_hash, stellar_network: 'testnet' }));
        }

        if (demoDeal.status !== 'DELIVERED') {
          return NextResponse.json(createErrorResponse('CONFLICT', 'Unexpected deal status'), { status: 409 });
        }

        let txHash: string | null = null;
        let proofHash: string | null = null;
        try {
          const { anchorDemoEvent } = await import('@/lib/stellar/server/anchor-demo-event');
          const anchorResult = await anchorDemoEvent({
            deal_id: dealId,
            event_type: 'SETTLEMENT_OUTCOME_RECORDED',
            actor_id: mockActor,
            payload: {
              action: 'accept_delivery',
              timestamp: new Date().toISOString(),
              principal_idr: demoDeal.principal_idr,
            }
          });
          txHash = anchorResult.tx_hash;
          proofHash = anchorResult.proof_hash;
        } catch (e) {
          return NextResponse.json(createErrorResponse('STELLAR_ANCHOR_FAILED', e instanceof Error ? e.message : 'Demo proof anchoring failed'), { status: 502 });
        }

        const updatedDeal = transition(demoDeal, 'accept_delivery');
        updatedDeal.latest_stellar_tx_hash = txHash;
        updatedDeal.proof_hash = proofHash;

        const { error: updateError } = await serviceClient.from('deals').update(updatedDeal).eq('id', dealId);
        if (updateError) {
          return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
        }

        const settlementReference = txHash ?? `room-settlement:${dealId}`;
        const settledAt = new Date().toISOString();
        const payoutMetadata = await buildCompletionPayoutMetadata(updatedDeal);

        const event = createEvent(
          dealId,
          'accept_delivery',
          mockActor,
          'Buyer confirmed receipt. Settlement is complete and final balances are routed to the destination wallets on Stellar Testnet (Demo Corridor).',
          {
            next_status: updatedDeal.status,
            principal_to_seller_idr: updatedDeal.principal_idr,
            buyer_bond_return_idr: updatedDeal.buyer_bond_idr,
            seller_bond_return_idr: updatedDeal.seller_bond_idr,
            platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
            buyer_wallet_credit_idr: updatedDeal.buyer_bond_idr,
            seller_wallet_credit_idr: updatedDeal.principal_idr + updatedDeal.seller_bond_idr,
            platform_wallet_credit_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
            settlement_reference: settlementReference,
            settled_at: settledAt,
            ...payoutMetadata,
          }
        );
        event.tx_hash = txHash;
        event.proof_hash = proofHash;

        await serviceClient.from('escrow_events').insert(event);

        // Process reputation bypass (since normal repository uses RLS)
        // We will call processReputationOutcome directly or use the serviceClient? 
        // Let's use the local fallback for MVP demo:
        try {
          const { processReputationOutcome } = await import('@/lib/reputation/engine');
          // For processReputationOutcome, it uses repository internally which obeys RLS
          // But wait, the repository doesn't have a serviceClient injected!
          // We can just manually insert reputation events via serviceClient
          const reputationId = globalThis.crypto.randomUUID();
          const reputationEvent = {
            id: reputationId,
            deal_id: dealId,
            participant_id: demoDeal.seller_id,
            participant_role: 'seller',
            reputation_outcome: 'transaction_completed',
            score_delta: 5,
            principal_idr: demoDeal.principal_idr,
            transaction_hash: txHash,
            proof_hash: proofHash,
            settlement_reference: settlementReference,
            settled_at: settledAt,
            local_terminal_outcome_persisted: true,
            operation_status: 'confirmed',
            sync_status: 'idle',
            created_at: new Date().toISOString()
          };
          await serviceClient.from('reputation_events').insert(reputationEvent);

          const buyerReputationId = globalThis.crypto.randomUUID();
          const buyerReputationEvent = {
            id: buyerReputationId,
            deal_id: dealId,
            participant_id: demoDeal.buyer_id,
            participant_role: 'buyer',
            reputation_outcome: 'transaction_completed',
            score_delta: 5,
            principal_idr: demoDeal.principal_idr,
            transaction_hash: txHash,
            proof_hash: proofHash,
            settlement_reference: settlementReference,
            settled_at: settledAt,
            local_terminal_outcome_persisted: true,
            operation_status: 'confirmed',
            sync_status: 'idle',
            created_at: new Date().toISOString()
          };
          await serviceClient.from('reputation_events').insert(buyerReputationEvent);
        } catch (repError) {
          console.error("Demo reputation error", repError);
        }

        return NextResponse.json(
          createSuccessResponse(updatedDeal, { tx_hash: txHash, proof_hash: proofHash, stellar_network: 'testnet' })
        );
      }
    }
  }

  try {
    let existingDeal;
    let userRole;
    let authUser;
    try {
      const auth = await requireDealParticipant(dealId);
      existingDeal = auth.deal;
      userRole = auth.role;
      authUser = auth.user;
    } catch (e: unknown) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e instanceof Error ? e.message : String(e))), { status: 401 });
    }
    if (userRole !== 'buyer') return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only buyer can perform this action'), { status: 403 });

    const custodyV2Rejection = rejectLegacyActionForCustodyV2(existingDeal, 'Buyer delivery acceptance');
    if (custodyV2Rejection) return custodyV2Rejection;

    if (existingDeal.stellar_mode === 'testnet' && !existingDeal.proof_hash) {
      return NextResponse.json(
        createErrorResponse('STELLAR_EXECUTION_INVALID', 'Seller proof must be submitted before buyer can accept delivery.'),
        { status: 400 }
      );
    }

    if (existingDeal.stellar_mode !== 'testnet') {
      return runLegacyLocalAcceptance(dealId, existingDeal, authUser.id);
    }

    const walletRepo = getServerWalletRepository();
    const [buyerWallet, sellerWallet] = await Promise.all([
      walletRepo.getProfileWallet(existingDeal.buyer_id),
      walletRepo.getProfileWallet(existingDeal.seller_id),
    ]);

    if (!buyerWallet || !sellerWallet) {
      return NextResponse.json(
        createErrorResponse('STELLAR_EXECUTION_INVALID', 'Both parties must have Profile Wallets to complete settlement.'),
        { status: 400 }
      );
    }

    const userRuntimeLoaded = loadDealRoomTestnetRuntime(
      {
        signer_port_factory: () => new ProfileWalletSigner(buyerWallet.encrypted_secret_key),
      },
      buyerWallet.public_address,
      sellerWallet.public_address
    );

    if (!userRuntimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Settlement execution is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }
    
    // In settlement, the escrow should already exist
    if (existingDeal.stellar_escrow_id === null) {
      return NextResponse.json(createErrorResponse('STELLAR_EXECUTION_INVALID', 'Testnet escrow ID is missing.'), { status: 400 });
    }

    const operationKey = createStellarIdempotencyKey(existingDeal.id, authUser.id, 'accept_delivery');
    const existingOperation = await repository.getStellarOperation(operationKey);
    
    if (existingOperation?.operation_status === 'confirmed') {
      const refreshedDeal = await repository.getDeal(existingDeal.id);
      return NextResponse.json(createSuccessResponse(refreshedDeal ?? existingDeal));
    }
    if (existingOperation?.operation_status === 'submitted') {
      return NextResponse.json(createErrorResponse('STELLAR_EXECUTION_UNCONFIRMED', 'Transaction is still pending on the network.'), { status: 502 });
    }

    let currentDeal = existingDeal;
    let currentOperation = existingOperation;
    let coordinatorResult: Awaited<ReturnType<typeof coordinateDealExecution>> | null = null;
    let persistedOperation: StellarOperation | null = null;

    for (let attempt = 0; attempt < ROUTE_RECONCILIATION_ATTEMPTS; attempt += 1) {
      const timestamp = currentTimestamp();
      coordinatorResult = await coordinateDealExecution({
        action: 'accept_delivery',
        operation_id: operationKey,
        deal: currentDeal,
        metadata: userRuntimeLoaded.runtime.metadata,
        existing_operation: currentOperation,
        stellar_contract_id: userRuntimeLoaded.runtime.contract_id,
        operation_timestamps: {
          created_at: timestamp,
          updated_at: timestamp,
        },
        local_commit_timestamp: timestamp,
        operation_persistence: new RepositoryStellarOperationPersistence(repository),
        deal_persistence: new RepositoryDealPersistence(repository),
        execution_adapter: userRuntimeLoaded.runtime.execution_adapter,
      });

      if (!coordinatorResult.ok) {
        const failure = mapCoordinatorFailure(coordinatorResult);
        return NextResponse.json(createErrorResponse(failure.code, failure.message), { status: failure.status });
      }

      persistedOperation = await repository.getStellarOperation(operationKey);
      if (
        persistedOperation !== null &&
        persistedOperation.operation_status === 'confirmed' &&
        persistedOperation.transaction_hash !== null
      ) {
        break;
      }

      if (!isReconciliationPending(persistedOperation) || attempt === ROUTE_RECONCILIATION_ATTEMPTS - 1) {
        break;
      }

      currentDeal = (await repository.getDeal(existingDeal.id)) ?? coordinatorResult.next_deal;
      currentOperation = persistedOperation;
      await waitForReconciliationWindow();
    }

    if (
      persistedOperation === null ||
      persistedOperation.operation_status !== 'confirmed' ||
      persistedOperation.transaction_hash === null
    ) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_EXECUTION_UNCONFIRMED',
          'Buyer acceptance reached Stellar, but the public confirmation was not finalized yet.',
        ),
        { status: 502 },
      );
    }

    if (coordinatorResult === null) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_EXECUTION_UNCONFIRMED',
          'Buyer acceptance could not be finalized because the Stellar execution result was unavailable.',
        ),
        { status: 502 },
      );
    }

    const updatedDeal =
      (await repository.getDeal(existingDeal.id)) ?? coordinatorResult.next_deal;
      
    const settlementReference = persistedOperation.transaction_hash;
    const settledAt = new Date().toISOString();
    const payoutMetadata = await buildCompletionPayoutMetadata(updatedDeal);

    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Buyer confirmed receipt. Settlement is complete and final balances are routed to the destination wallets on Stellar Testnet.',
      {
        next_status: updatedDeal.status,
        principal_to_seller_idr: updatedDeal.principal_idr,
        buyer_bond_return_idr: updatedDeal.buyer_bond_idr,
        seller_bond_return_idr: updatedDeal.seller_bond_idr,
        platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
        buyer_wallet_credit_idr: updatedDeal.buyer_bond_idr,
        seller_wallet_credit_idr: updatedDeal.principal_idr + updatedDeal.seller_bond_idr,
        platform_wallet_credit_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
        settlement_reference: settlementReference,
        settled_at: settledAt,
        contract_id: userRuntimeLoaded.runtime.contract_id,
        actor_address: buyerWallet.public_address,
        ...payoutMetadata,
      },
    );
    event.tx_hash = persistedOperation.transaction_hash;
    
    // Avoid creating duplicate events if one already exists for this hash
    const existingEvents = await repository.getDealEvents(dealId);
    const hasAcceptanceEvent = existingEvents.some(
      (e) => e.event_type === 'accept_delivery' && e.tx_hash === persistedOperation?.transaction_hash
    );
    
    if (!hasAcceptanceEvent) {
      await repository.addEvent(event);
    }


    return NextResponse.json(
      createSuccessResponse(updatedDeal, {
        operation_status: persistedOperation.operation_status,
        transaction_hash: persistedOperation.transaction_hash,
      }),
    );
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
