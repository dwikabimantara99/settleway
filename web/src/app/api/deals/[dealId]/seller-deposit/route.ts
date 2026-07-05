import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { coordinateDealExecution } from '@/lib/stellar/server/deal-execution-coordinator';
import { createStellarIdempotencyKey, buildCanonicalDealHashInput } from '@/lib/stellar/helpers';
import { RepositoryDealPersistence, RepositoryStellarOperationPersistence } from '@/lib/stellar/server/repository-execution-persistence';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import type { DealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { composeDealRoomFundingRuntime } from '@/lib/stellar/server/deal-room-funding-runtime';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { ProfileWalletSigner } from '@/lib/stellar/server/profile-wallet-signer';
import type { StellarOperation } from '@/lib/stellar/types';
import { rejectLegacyActionForCustodyV2 } from '@/lib/deals/rail-guards';

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
      return { status: 400, code: 'STELLAR_EXECUTION_INVALID', message: 'The Testnet funding input is not valid for this deal state.' };
    default:
      return { status: 502, code: 'STELLAR_EXECUTION_FAILED', message: 'The Stellar Testnet funding action could not be confirmed.' };
  }
}

async function runLegacyLocalSellerDeposit(
  dealId: string,
  existingDeal: DbDeal,
  authUser: { id: string },
) {
  const updatedDeal = transition(existingDeal, 'seller_deposit');
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) {
    return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
  }

  const event = createEvent(
    dealId,
    'seller_deposit',
    authUser.id,
    'Seller deposit recorded for escrow preparation.',
    {
      participant_role: 'seller',
      deposit_total_idr: updatedDeal.seller_total_idr,
      next_status: updatedDeal.status,
    },
  );
  await repository.addEvent(event);

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
    await repository.addEvent(lockEvent);
  }

  return NextResponse.json(createSuccessResponse(updatedDeal));
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
  const operationKey = createStellarIdempotencyKey(input.deal.id, null, 'create_deal');

  for (let attempt = 0; attempt < ROUTE_RECONCILIATION_ATTEMPTS; attempt += 1) {
    const existingOperation = await repository.getStellarOperation(operationKey);
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
      operation_persistence: new RepositoryStellarOperationPersistence(repository),
      deal_persistence: new RepositoryDealPersistence(repository),
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
  const actionName = 'seller_deposit' as EscrowAction;

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
    if (userRole !== 'seller') return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only seller can perform this action'), { status: 403 });

    const custodyV2Rejection = rejectLegacyActionForCustodyV2(existingDeal, 'Seller deposit');
    if (custodyV2Rejection) return custodyV2Rejection;

    if (existingDeal.stellar_mode !== 'testnet') {
      return runLegacyLocalSellerDeposit(dealId, existingDeal, authUser);
    }

    const walletRepo = getServerWalletRepository();
    const [buyerWallet, sellerWallet] = await Promise.all([
      walletRepo.getProfileWallet(existingDeal.buyer_id),
      walletRepo.getProfileWallet(existingDeal.seller_id),
    ]);

    if (!buyerWallet) {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'The buyer must create a Profile Wallet before you can fund this deal.'), { status: 400 });
    }
    if (!sellerWallet) {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'You must create a Profile Wallet before funding this deal.'), { status: 400 });
    }

    const adminRuntimeLoaded = loadDealRoomTestnetRuntime(
      {},
      buyerWallet.public_address,
      sellerWallet.public_address
    );
    const userRuntimeLoaded = loadDealRoomTestnetRuntime(
      {
        signer_port_factory: () => new ProfileWalletSigner(sellerWallet.encrypted_secret_key),
      },
      buyerWallet.public_address,
      sellerWallet.public_address
    );

    if (!adminRuntimeLoaded.ok || !userRuntimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Seller funding is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    const preparedDeal = await ensureTestnetEscrowPrepared({
      deal: existingDeal,
      runtime: adminRuntimeLoaded.runtime,
    });
    if (!preparedDeal.ok) {
      const failure = mapCoordinatorFailure(preparedDeal.result);
      return NextResponse.json(createErrorResponse(failure.code, failure.message), { status: failure.status });
    }

    const fundingRuntime = composeDealRoomFundingRuntime({
      deal: preparedDeal.deal,
      action: 'seller_deposit',
      contract_id: userRuntimeLoaded.runtime.contract_id,
      buyer_address: buyerWallet.public_address,
      seller_address: sellerWallet.public_address,
    });
    if (!fundingRuntime.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_EXECUTION_INVALID',
          'Seller funding could not be composed for the current Testnet room state.',
        ),
        { status: 400 },
      );
    }

    const existingOperation = await repository.getStellarOperation(
      createStellarIdempotencyKey(preparedDeal.deal.id, preparedDeal.deal.status, 'seller_deposit'),
    );
    const operationKey = createStellarIdempotencyKey(preparedDeal.deal.id, preparedDeal.deal.status, 'seller_deposit');
    let currentDeal = preparedDeal.deal;
    let currentOperation = existingOperation;
    let coordinatorResult: Awaited<ReturnType<typeof coordinateDealExecution>> | null = null;
    let persistedOperation: StellarOperation | null = null;

    for (let attempt = 0; attempt < ROUTE_RECONCILIATION_ATTEMPTS; attempt += 1) {
      const timestamp = currentTimestamp();
      coordinatorResult = await coordinateDealExecution({
        action: 'seller_deposit',
        operation_id: `route:${preparedDeal.deal.id}:seller_deposit:${timestamp}`,
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

      currentDeal = (await repository.getDeal(preparedDeal.deal.id)) ?? coordinatorResult.next_deal;
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
          'Seller funding reached Stellar, but the public confirmation was not finalized yet.',
        ),
        { status: 502 },
      );
    }

    if (coordinatorResult === null) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_EXECUTION_UNCONFIRMED',
          'Seller funding could not be finalized because the Stellar execution result was unavailable.',
        ),
        { status: 502 },
      );
    }

    const updatedDeal =
      (await repository.getDeal(preparedDeal.deal.id)) ?? coordinatorResult.next_deal;
    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Seller funding was confirmed through the Testnet-backed escrow path.',
      {
        participant_role: 'seller',
        deposit_total_idr: updatedDeal.seller_total_idr,
        next_status: updatedDeal.status,
        contract_id: userRuntimeLoaded.runtime.contract_id,
        actor_address: fundingRuntime.context.funding_intent.actor_address,
        public_proof: fundingRuntime.context.public_proof,
      },
    );
    event.tx_hash = persistedOperation.transaction_hash;
    await repository.addEvent(event);

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
      await repository.addEvent(lockEvent);
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
