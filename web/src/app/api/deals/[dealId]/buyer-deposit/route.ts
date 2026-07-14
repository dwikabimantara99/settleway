import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { repository } from '@/lib/repositories';
import { createPrivilegedServerRepository } from '@/lib/repositories/server-repository';
import { getServiceRoleClient } from '@/lib/db/server-service-client';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { coordinateDealExecution } from '@/lib/stellar/server/deal-execution-coordinator';
import { mapCoordinatorFailure } from '@/lib/stellar/server/deal-room-route-execution';
import { createStellarIdempotencyKey, buildCanonicalDealHashInput } from '@/lib/stellar/helpers';
import { RepositoryDealPersistence, RepositoryStellarOperationPersistence } from '@/lib/stellar/server/repository-execution-persistence';
import { loadDealRoomTestnetRuntime, checkTestnetBalance } from '@/lib/stellar/server/deal-room-testnet-runtime';
import type { DealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { composeDealRoomFundingRuntime } from '@/lib/stellar/server/deal-room-funding-runtime';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { ProfileWalletSigner } from '@/lib/stellar/server/profile-wallet-signer';
import type { StellarOperation } from '@/lib/stellar/types';
import { rejectLegacyActionForCustodyV2 } from '@/lib/deals/rail-guards';
import { anchorDemoEvent } from '@/lib/stellar/server/anchor-demo-event';

function currentTimestamp(): string {
  return new Date().toISOString();
}

// Live Testnet confirmation can arrive a few seconds after the initial submit.
// Keep the route bounded, but long enough to absorb the normal confirmation lag.
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

async function runLegacyLocalBuyerDeposit(
  dealId: string,
  existingDeal: DbDeal,
  authUser: { id: string },
) {
  if (process.env.NEXT_PUBLIC_RUNTIME_MODE === 'persistent') {
    throw new Error('Testnet custody is required in persistent mode. Legacy local mock funding is strictly disabled.');
  }

  const txHash: string | null = null;
  const proofHash: string | null = null;

  const updatedDeal = transition(existingDeal, 'buyer_deposit');
  if (txHash && proofHash) {
    updatedDeal.latest_stellar_tx_hash = txHash;
    updatedDeal.proof_hash = proofHash;
  }
  
  const privilegedRepo = createPrivilegedServerRepository();
  const { replaced } = await privilegedRepo.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) {
    return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
  }

  const event = createEvent(
    dealId,
    'buyer_deposit',
    authUser.id,
    'Buyer deposit recorded for escrow preparation.',
    {
      participant_role: 'buyer',
      deposit_total_idr: updatedDeal.buyer_total_idr,
      next_status: updatedDeal.status,
    },
  );
  if (txHash) {
    event.tx_hash = txHash;
    event.proof_hash = proofHash;
  }
  await privilegedRepo.addEvent(event);

  if (updatedDeal.status === 'LOCKED') {
    const protectedValueIdr =
      updatedDeal.principal_idr + updatedDeal.buyer_bond_idr + updatedDeal.seller_bond_idr;
    const lockEvent = createEvent(
      dealId,
      'escrow_locked',
      authUser.id,
      'Escrow locked after both required deposits were confirmed.',
      {
        protected_value_idr: protectedValueIdr,
        buyer_total_idr: updatedDeal.buyer_total_idr,
        seller_total_idr: updatedDeal.seller_total_idr,
        platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
        next_status: updatedDeal.status,
      },
    );
    if (txHash) {
      lockEvent.tx_hash = txHash;
      lockEvent.proof_hash = proofHash;
    }
    await privilegedRepo.addEvent(lockEvent);
  }

  return NextResponse.json(
    createSuccessResponse(updatedDeal, txHash ? { tx_hash: txHash, proof_hash: proofHash, stellar_network: 'testnet' } : undefined)
  );
}

function deriveDealHash(existingDeal: DbDeal) {
  if (existingDeal.volume_kg === null) {
    throw new Error('Deal volume is required before Testnet escrow preparation.');
  }

  const payload = buildCanonicalDealHashInput({
    version: '1',
    deal_id: existingDeal.id,
    buyer_id: existingDeal.buyer_id,
    seller_id: existingDeal.seller_id,
    commodity: existingDeal.commodity,
    volume_kg: String(existingDeal.volume_kg),
    principal_idr: String(existingDeal.principal_idr),
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

function deriveExpiryUnixSeconds(existingDeal: DbDeal) {
  const deadline = existingDeal.terms.deposit_deadline_at;
  if (typeof deadline !== 'string' || deadline.trim() === '') {
    throw new Error('Deposit deadline is required before Testnet escrow preparation.');
  }

  const millis = Date.parse(deadline);
  if (!Number.isFinite(millis)) {
    throw new Error('Deposit deadline could not be converted into Testnet expiry time.');
  }

  return String(Math.floor(millis / 1000));
}

async function ensureTestnetEscrowPrepared(input: {
  deal: DbDeal;
  runtime: DealRoomTestnetRuntime;
}) {
  if (input.deal.stellar_escrow_id !== null) {
    return { ok: true as const, deal: input.deal };
  }

  let currentDeal = input.deal;
  const operationKey = createStellarIdempotencyKey(input.deal.id, "WAITING_DEPOSITS", "create_deal");

  for (let attempt = 0; attempt < ROUTE_RECONCILIATION_ATTEMPTS; attempt += 1) {
    const existingOperation = await repository.getStellarOperation(operationKey);

    if (existingOperation?.operation_status === 'failed') {
      if (existingOperation.public_error_code === 'ERR_AUTH_FAILED') {
        return {
          ok: false as const,
          result: {
            ok: false,
            reason: 'ERR_EXECUTION_SERVICE_FAILURE',
            inner_result: { ok: false, error_code: 'ERR_SIGNER_UNAVAILABLE' }
          } as const,
        };
      }
      if (existingOperation.public_error_code === 'ERR_TIMEOUT') {
        return {
          ok: false as const,
          result: {
            ok: false,
            reason: 'ERR_EXECUTION_SERVICE_FAILURE',
            inner_result: { ok: false, error_code: 'ERR_EXECUTION_TIMEOUT' }
          } as const,
        };
      }
    }

    const timestamp = currentTimestamp();
    const result = await coordinateDealExecution({
      action: 'create_deal',
      operation_id: `route:${input.deal.id}:create_deal:${timestamp}`,
      deal: currentDeal,
      metadata: input.runtime.metadata,
      deal_hash: deriveDealHash(currentDeal),
      expires_at: deriveExpiryUnixSeconds(currentDeal),
      existing_operation: existingOperation,
      stellar_contract_id: input.runtime.contract_id,
      operation_timestamps: {
        created_at: timestamp,
        updated_at: timestamp,
      },
      local_commit_timestamp: timestamp,
      operation_persistence: new RepositoryStellarOperationPersistence(createPrivilegedServerRepository()),
      deal_persistence: new RepositoryDealPersistence(createPrivilegedServerRepository()),
      execution_adapter: input.runtime.execution_adapter,
    });

    if (!result.ok) {
      return { ok: false as const, result };
    }

    const refreshedDeal = await repository.getDeal(input.deal.id);
    if (refreshedDeal && refreshedDeal.stellar_escrow_id !== null) {
      return { ok: true as const, deal: refreshedDeal };
    }

    const persistedOperation = await repository.getStellarOperation(operationKey);
    if (!isReconciliationPending(persistedOperation) || attempt === ROUTE_RECONCILIATION_ATTEMPTS - 1) {
      if (persistedOperation && persistedOperation.operation_status === 'failed' && persistedOperation.public_error_code === 'ERR_AUTH_FAILED') {
        return {
          ok: false as const,
          result: {
            ok: false,
            reason: 'ERR_EXECUTION_SERVICE_FAILURE',
            inner_result: { ok: false, error_code: 'ERR_SIGNER_UNAVAILABLE' }
          } as const,
        };
      }
      return {
        ok: false as const,
        result: {
          ok: false,
          reason: 'ERR_EXECUTION_SERVICE_FAILURE',
          inner_result: 'Escrow bootstrap completed without a persisted escrow id.',
        } as const,
      };
    }

    currentDeal = refreshedDeal ?? result.next_deal;
    await waitForReconciliationWindow();
  }

  return {
    ok: false as const,
    result: {
      ok: false,
      reason: 'ERR_EXECUTION_SERVICE_FAILURE',
      inner_result: 'Escrow bootstrap reconciliation exceeded the route retry window.',
    } as const,
  };
}

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'buyer_deposit' as EscrowAction;

  if (dealId === 'demo-cabai-001') {
    const cookieStore = await cookies();
    const mockActor = cookieStore.get('mock_actor')?.value;
    if (mockActor === 'buyer-surabaya-restaurant') {
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
        if (demoDeal.status === 'BUYER_FUNDED' && demoDeal.latest_stellar_tx_hash) {
          return NextResponse.json(createSuccessResponse(demoDeal, { tx_hash: demoDeal.latest_stellar_tx_hash, proof_hash: demoDeal.proof_hash, stellar_network: 'testnet' }));
        }

        if (demoDeal.status !== 'WAITING_DEPOSITS') {
          return NextResponse.json(createErrorResponse('CONFLICT', 'Unexpected deal status'), { status: 409 });
        }

        let txHash: string | null = null;
        let proofHash: string | null = null;
        try {
          const anchorResult = await anchorDemoEvent({
            deal_id: dealId,
            event_type: 'BUYER_DEPOSIT_INTENT_RECORDED',
            actor_id: mockActor,
            payload: {
              amount_idr: demoDeal.buyer_total_idr,
              action: 'buyer_deposit',
              timestamp: new Date().toISOString(),
            }
          });
          txHash = anchorResult.tx_hash;
          proofHash = anchorResult.proof_hash;
        } catch (e) {
          return NextResponse.json(createErrorResponse('STELLAR_ANCHOR_FAILED', e instanceof Error ? e.message : 'Demo proof anchoring failed'), { status: 502 });
        }

        const updatedDeal = transition(demoDeal, 'buyer_deposit');
        updatedDeal.latest_stellar_tx_hash = txHash;
        updatedDeal.proof_hash = proofHash;

        const { error: updateError } = await serviceClient.from('deals').update(updatedDeal).eq('id', dealId);
        if (updateError) {
          return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
        }

        const event = createEvent(
          dealId,
          'buyer_deposit',
          mockActor,
          'Buyer deposit recorded for escrow preparation.',
          {
            participant_role: 'buyer',
            deposit_total_idr: updatedDeal.buyer_total_idr,
            next_status: updatedDeal.status,
          }
        );
        event.tx_hash = txHash;
        event.proof_hash = proofHash;

        await serviceClient.from('escrow_events').insert(event);

        if (updatedDeal.status === 'LOCKED') {
          const protectedValueIdr = updatedDeal.principal_idr + updatedDeal.buyer_bond_idr + updatedDeal.seller_bond_idr;
          const lockEvent = createEvent(dealId, 'escrow_locked', mockActor, 'Escrow locked after both required deposits were confirmed.', {
            protected_value_idr: protectedValueIdr,
            buyer_total_idr: updatedDeal.buyer_total_idr,
            seller_total_idr: updatedDeal.seller_total_idr,
            platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
            next_status: updatedDeal.status,
          });
          lockEvent.tx_hash = txHash;
          lockEvent.proof_hash = proofHash;
          await serviceClient.from('escrow_events').insert(lockEvent);
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

    const custodyV2Rejection = rejectLegacyActionForCustodyV2(existingDeal, 'Buyer deposit');
    if (custodyV2Rejection) return custodyV2Rejection;

    if (existingDeal.stellar_mode !== 'testnet') {
      if (process.env.NEXT_PUBLIC_RUNTIME_MODE === 'persistent') {
        throw new Error('Testnet custody is required in persistent mode. Legacy local mock funding is strictly disabled.');
      }
      return runLegacyLocalBuyerDeposit(dealId, existingDeal, authUser);
    }

    const walletRepo = getServerWalletRepository();
    const [buyerWallet, sellerWallet] = await Promise.all([
      walletRepo.getProfileWallet(existingDeal.buyer_id),
      walletRepo.getProfileWallet(existingDeal.seller_id),
    ]);

    if (!buyerWallet) {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'You must create a Profile Wallet before funding this deal.'), { status: 400 });
    }
    if (!sellerWallet) {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'The seller must create a Profile Wallet before you can fund this deal.'), { status: 400 });
    }


    const preflight = await checkTestnetBalance(buyerWallet.public_address, 100);
    if (preflight.status === 'insufficient') {
      return NextResponse.json(createErrorResponse('INSUFFICIENT_PROFILE_WALLET_BALANCE', 'The Profile Wallet does not have enough XLM to perform this deposit on Testnet.'), { status: 400 });
    }
    if (preflight.status === 'unavailable') {
      return NextResponse.json(createErrorResponse('PROFILE_WALLET_BALANCE_UNAVAILABLE', 'The Profile Wallet balance could not be verified on Testnet.'), { status: 400 });
    }
    
    const adminRuntimeLoaded = loadDealRoomTestnetRuntime(
      {},
      buyerWallet.public_address,
      sellerWallet.public_address
    );
    const userRuntimeLoaded = loadDealRoomTestnetRuntime(
      {
        signer_port_factory: () => new ProfileWalletSigner(buyerWallet.encrypted_secret_key, buyerWallet.public_address),
      },
      buyerWallet.public_address,
      sellerWallet.public_address
    );

    if (!adminRuntimeLoaded.ok || !userRuntimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Buyer funding is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    const preparedDeal = await ensureTestnetEscrowPrepared({
      deal: existingDeal,
      runtime: adminRuntimeLoaded.runtime,
    });
    if (!preparedDeal.ok) {
      const failure = mapCoordinatorFailure(preparedDeal.result, 'escrow preparation');
      return NextResponse.json(createErrorResponse(failure.code, failure.message, true, failure.diagnostic), { status: failure.status });
    }

    const existingOperation = await repository.getStellarOperation(
      createStellarIdempotencyKey(preparedDeal.deal.id, authUser.id, 'buyer_deposit'),
    );
    if (existingOperation?.operation_status === 'confirmed') {
      return NextResponse.json(createSuccessResponse(preparedDeal.deal));
    }
    if (existingOperation?.operation_status === 'submitted') {
      return NextResponse.json(createErrorResponse('STELLAR_EXECUTION_UNCONFIRMED', 'Transaction is still pending on the network.'), { status: 502 });
    }
    if (existingOperation?.operation_status === 'failed') {
      if (existingOperation.public_error_code === 'ERR_AUTH_FAILED') {
        return NextResponse.json(
          createErrorResponse(
            'ERR_SIGNER_REJECTED',
            'Profile Wallet was found, but this demo wallet cannot sign funding transactions. No deposit was made.',
          ),
          { status: 502 },
        );
      }
      if (existingOperation.public_error_code === 'ERR_TIMEOUT') {
        return NextResponse.json(
          createErrorResponse(
            'ERR_EXECUTION_TIMEOUT',
            'Funding was submitted but could not be confirmed yet. Do not treat this as funded until a tx hash is confirmed.',
          ),
          { status: 504 },
        );
      }
    }
    const fundingRuntime = composeDealRoomFundingRuntime({
      deal: preparedDeal.deal,
      action: 'buyer_deposit',
      contract_id: userRuntimeLoaded.runtime.contract_id,
      buyer_address: buyerWallet.public_address,
      seller_address: sellerWallet.public_address,
    });
    if (!fundingRuntime.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_EXECUTION_INVALID',
          'Buyer funding could not be composed for the current Testnet room state.',
        ),
        { status: 400 },
      );
    }

    const operationKey = createStellarIdempotencyKey(preparedDeal.deal.id, authUser.id, 'buyer_deposit');
    let currentDeal = preparedDeal.deal;
    let currentOperation = existingOperation;
    let coordinatorResult: Awaited<ReturnType<typeof coordinateDealExecution>> | null = null;
    let persistedOperation: StellarOperation | null = null;

    for (let attempt = 0; attempt < ROUTE_RECONCILIATION_ATTEMPTS; attempt += 1) {
      const timestamp = currentTimestamp();
      coordinatorResult = await coordinateDealExecution({
        action: 'buyer_deposit',
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
        operation_persistence: new RepositoryStellarOperationPersistence(createPrivilegedServerRepository()),
        deal_persistence: new RepositoryDealPersistence(createPrivilegedServerRepository()),
        execution_adapter: userRuntimeLoaded.runtime.execution_adapter,
      });

      if (!coordinatorResult.ok) {
        const failure = mapCoordinatorFailure(coordinatorResult, 'buyer deposit');
        return NextResponse.json(createErrorResponse(failure.code, failure.message, true, failure.diagnostic), { status: failure.status });
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

      currentDeal = (await repository.getDeal(preparedDeal.deal.id)) ?? coordinatorResult.next_deal;
      currentOperation = persistedOperation;
      await waitForReconciliationWindow();
    }

    if (persistedOperation !== null && persistedOperation.operation_status === 'failed' && persistedOperation.public_error_code === 'ERR_AUTH_FAILED') {
      return NextResponse.json(
        createErrorResponse(
          'ERR_SIGNER_REJECTED',
          'Profile Wallet was found, but this demo wallet cannot sign funding transactions. No deposit was made.',
        ),
        { status: 502 },
      );
    }

    if (
      persistedOperation === null ||
      persistedOperation.operation_status !== 'confirmed' ||
      persistedOperation.transaction_hash === null
    ) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_EXECUTION_UNCONFIRMED',
          'Buyer funding reached Stellar, but the public confirmation was not finalized yet.',
        ),
        { status: 502 },
      );
    }

    if (coordinatorResult === null) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_EXECUTION_UNCONFIRMED',
          'Buyer funding could not be finalized because the Stellar execution result was unavailable.',
        ),
        { status: 502 },
      );
    }

    const privilegedRepo = createPrivilegedServerRepository();
    const updatedDeal =
      (await privilegedRepo.getDeal(preparedDeal.deal.id)) ?? coordinatorResult.next_deal;
    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Buyer funding was confirmed through the Testnet-backed escrow path.',
      {
        participant_role: 'buyer',
        deposit_total_idr: updatedDeal.buyer_total_idr,
        next_status: updatedDeal.status,
        contract_id: userRuntimeLoaded.runtime.contract_id,
        actor_address: fundingRuntime.context.funding_intent.actor_address,
        public_proof: fundingRuntime.context.public_proof,
      },
    );
    event.tx_hash = persistedOperation.transaction_hash;
    await privilegedRepo.addEvent(event);

    if (updatedDeal.status === 'LOCKED') {
      const protectedValueIdr =
        updatedDeal.principal_idr + updatedDeal.buyer_bond_idr + updatedDeal.seller_bond_idr;
      const lockEvent = createEvent(
        dealId,
        'escrow_locked',
        authUser.id,
        'Escrow locked after both required deposits were confirmed on Stellar Testnet.',
        {
          protected_value_idr: protectedValueIdr,
          buyer_total_idr: updatedDeal.buyer_total_idr,
          seller_total_idr: updatedDeal.seller_total_idr,
          platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
          next_status: updatedDeal.status,
          contract_id: userRuntimeLoaded.runtime.contract_id,
        },
      );
      lockEvent.tx_hash = persistedOperation.transaction_hash;
      await privilegedRepo.addEvent(lockEvent);
    }

    return NextResponse.json(
      createSuccessResponse(updatedDeal, {
        operation_status: persistedOperation.operation_status,
        transaction_hash: persistedOperation.transaction_hash,
        public_proof: fundingRuntime.context.public_proof,
      }),
    );
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
