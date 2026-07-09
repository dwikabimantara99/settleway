import 'server-only';
import { repository } from '@/lib/repositories';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { ProfileWalletSigner } from '@/lib/stellar/server/profile-wallet-signer';
import { loadDealRoomTestnetRuntime, checkTestnetBalance } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { composeDealRoomFundingRuntime } from '@/lib/stellar/server/deal-room-funding-runtime';
import { coordinateDealExecution } from '@/lib/stellar/server/deal-execution-coordinator';
import { createStellarIdempotencyKey, buildCanonicalDealHashInput } from '@/lib/stellar/helpers';
import { RepositoryDealPersistence, RepositoryStellarOperationPersistence } from '@/lib/stellar/server/repository-execution-persistence';
import type { DbDeal } from '@/lib/db/types';
import type { DealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import crypto from 'node:crypto';
import { createEvent } from '@/lib/escrow/events';
import type { StellarOperation } from '@/lib/stellar/types';
import type { EscrowAction } from '@/lib/escrow/state-machine';

// Replicated from route.ts because it is tightly coupled and not exported
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

    if (existingOperation?.operation_status === 'failed') {
      return {
        ok: false as const,
        result: {
          ok: false,
          reason: 'ERR_EXECUTION_SERVICE_FAILURE',
          inner_result: { ok: false, error_code: 'ERR_SIGNER_UNAVAILABLE' }
        } as const,
      };
    }

    const timestamp = new Date().toISOString();
    const result = await coordinateDealExecution({
      action: 'create_deal',
      operation_id: `headless:${input.deal.id}:create_deal:${timestamp}`,
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
          inner_result: 'Escrow bootstrap failed to finalize in headless hook.',
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
      inner_result: 'Escrow bootstrap reconciliation exceeded window.',
    } as const,
  };
}

export interface HeadlessExecuteParams {
  dealId: string;
  actorId: string;
  expectedRole: 'buyer' | 'seller';
  action: 'buyer_deposit' | 'seller_deposit';
  idempotencyKey?: string;
}

export interface HeadlessExecuteResult {
  ok: boolean;
  action: 'buyer_deposit' | 'seller_deposit';
  actorRole: 'buyer' | 'seller';
  transactionHash?: string | null;
  nextDealStatus?: string;
  blocker?: string;
}

export async function executeHeadlessSmokeAction(params: HeadlessExecuteParams): Promise<HeadlessExecuteResult> {
  if (process.env.RUNTIME_MODE !== 'persistent' || process.env.NEXT_PUBLIC_RUNTIME_MODE !== 'persistent') {
    throw new Error("Headless hook requires RUNTIME_MODE=persistent");
  }
  if (process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION !== '1') {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Headless execution is gated off. Set ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1 to enable." };
  }
  if (!process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE || process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE.includes('Public Global')) {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Hook refuses mainnet config" };
  }

  const existingDeal = await repository.getDeal(params.dealId);
  if (!existingDeal) {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Deal not found" };
  }
  if (existingDeal.stellar_mode !== 'testnet') {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Deal is not in testnet mode" };
  }

  const expectedActorId = params.expectedRole === 'buyer' ? existingDeal.buyer_id : existingDeal.seller_id;
  if (params.actorId !== expectedActorId) {
    return {
      ok: false,
      action: params.action,
      actorRole: params.expectedRole,
      blocker: 'Actor does not match expected deal participant role',
    };
  }

  if (
    (params.action === 'buyer_deposit' && params.expectedRole !== 'buyer') ||
    (params.action === 'seller_deposit' && params.expectedRole !== 'seller')
  ) {
    return {
      ok: false,
      action: params.action,
      actorRole: params.expectedRole,
      blocker: 'Action does not match expected participant role',
    };
  }

  const walletRepo = getServerWalletRepository();
  const [buyerWallet, sellerWallet] = await Promise.all([
    walletRepo.getProfileWallet(existingDeal.buyer_id),
    walletRepo.getProfileWallet(existingDeal.seller_id),
  ]);

  if (!buyerWallet || !sellerWallet) {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Wallets not fully provisioned" };
  }

  const actorWallet = params.expectedRole === 'buyer' ? buyerWallet : sellerWallet;

  const preflight = await checkTestnetBalance(actorWallet.public_address, 100);
  if (preflight.status === 'insufficient' || preflight.status === 'unavailable') {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: `Insufficient balance or network unavailable for ${params.expectedRole}` };
  }

  const adminRuntimeLoaded = loadDealRoomTestnetRuntime(
    {},
    buyerWallet.public_address,
    sellerWallet.public_address
  );

  const userRuntimeLoaded = loadDealRoomTestnetRuntime(
    {
      signer_port_factory: () => new ProfileWalletSigner(actorWallet.encrypted_secret_key, actorWallet.public_address),
    },
    buyerWallet.public_address,
    sellerWallet.public_address
  );

  if (!adminRuntimeLoaded.ok || !userRuntimeLoaded.ok) {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Stellar runtime unavailable" };
  }

  const preparedDeal = await ensureTestnetEscrowPrepared({
    deal: existingDeal,
    runtime: adminRuntimeLoaded.runtime,
  });
  if (!preparedDeal.ok) {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Escrow preparation failed" };
  }

  const idempotencyKey = params.idempotencyKey || createStellarIdempotencyKey(preparedDeal.deal.id, params.actorId, params.action);
  const existingOperation = await repository.getStellarOperation(idempotencyKey);

  if (existingOperation?.operation_status === 'confirmed') {
    return { ok: true, action: params.action, actorRole: params.expectedRole, transactionHash: existingOperation.transaction_hash, nextDealStatus: preparedDeal.deal.status };
  }

  const fundingRuntime = composeDealRoomFundingRuntime({
    deal: preparedDeal.deal,
    action: params.action,
    contract_id: userRuntimeLoaded.runtime.contract_id,
    buyer_address: buyerWallet.public_address,
    seller_address: sellerWallet.public_address,
  });
  if (!fundingRuntime.ok) {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Funding runtime composition failed" };
  }

  let currentDeal = preparedDeal.deal;
  let currentOperation = existingOperation;
  let coordinatorResult: Awaited<ReturnType<typeof coordinateDealExecution>> | null = null;
  let persistedOperation: StellarOperation | null = null;

  for (let attempt = 0; attempt < ROUTE_RECONCILIATION_ATTEMPTS; attempt += 1) {
    const timestamp = new Date().toISOString();
    coordinatorResult = await coordinateDealExecution({
      action: params.action,
      operation_id: idempotencyKey,
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
       return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: `Coordinator execution failed` };
    }

    persistedOperation = await repository.getStellarOperation(idempotencyKey);
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

  if (!persistedOperation || persistedOperation.operation_status !== 'confirmed') {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Operation unconfirmed or failed" };
  }

  const updatedDeal = (await repository.getDeal(preparedDeal.deal.id)) ?? coordinatorResult!.next_deal;

  const event = createEvent(
    params.dealId,
    params.action,
    params.actorId,
    `Headless ${params.expectedRole} execution confirmed.`,
    {
      participant_role: params.expectedRole,
      next_status: updatedDeal.status,
      contract_id: userRuntimeLoaded.runtime.contract_id,
      actor_address: fundingRuntime.context.funding_intent.actor_address,
      public_proof: fundingRuntime.context.public_proof,
    },
  );
  event.tx_hash = persistedOperation.transaction_hash;
  await repository.addEvent(event);

  if (updatedDeal.status === 'LOCKED') {
    const lockEvent = createEvent(
      params.dealId,
      'escrow_locked',
      params.actorId,
      'Escrow locked headless.',
      { next_status: updatedDeal.status }
    );
    lockEvent.tx_hash = persistedOperation.transaction_hash;
    await repository.addEvent(lockEvent);
  }

  return {
    ok: true,
    action: params.action,
    actorRole: params.expectedRole,
    transactionHash: persistedOperation.transaction_hash,
    nextDealStatus: updatedDeal.status
  };
}
