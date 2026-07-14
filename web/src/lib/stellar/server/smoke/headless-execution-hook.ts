import 'server-only';
import { getAdminSmokeRepository } from '@/lib/stellar/server/smoke/headless-smoke-admin-context';
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
  const repository = getAdminSmokeRepository();
  if (input.deal.stellar_escrow_id !== null) {
    return { ok: true as const, deal: input.deal };
  }

  let currentDeal = input.deal;
  const isCustody = input.deal.rail_version === 'custody_v2_testnet';
  const actionType = isCustody ? 'create_deal_custody' : 'create_deal';
  const operationKey = createStellarIdempotencyKey(input.deal.id, "WAITING_DEPOSITS", actionType);

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
      action: actionType,
      operation_id: `headless:${input.deal.id}:${actionType}:${timestamp}`,
      deal: currentDeal,
      metadata: isCustody 
        ? { ...input.runtime.metadata, contract_id: input.runtime.custody_contract_id } 
        : input.runtime.metadata,
      deal_hash: deriveDealHash(currentDeal),
      token_address: input.runtime.testnet_token_contract_id,
      fee_recipient: input.runtime.metadata.admin_address,
      expires_at: deriveExpiryUnixSeconds(currentDeal),
      existing_operation: existingOperation,
      stellar_contract_id: isCustody ? input.runtime.custody_contract_id : input.runtime.contract_id,
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
          inner_result: `Escrow bootstrap failed to finalize in headless hook. Op: ${JSON.stringify(persistedOperation)}`,
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
  expectedRole: 'buyer' | 'seller' | 'admin';
  action: 'buyer_deposit' | 'seller_deposit' | 'submit_proof' | 'mark_delivered' | 'accept_delivery' | 'buyer_deposit_custody' | 'seller_deposit_custody' | 'submit_proof_custody' | 'mark_delivered_custody' | 'accept_delivery_custody';
  proofHash?: string;
  idempotencyKey?: string;
}

export interface HeadlessExecuteResult {
  ok: boolean;
  action: HeadlessExecuteParams['action'];
  actorRole: HeadlessExecuteParams['expectedRole'];
  transactionHash?: string | null;
  nextDealStatus?: string;
  blocker?: string;
}

export async function executeHeadlessSmokeAction(params: HeadlessExecuteParams): Promise<HeadlessExecuteResult> {
  // NOTE: proof_submitted, mark_delivered, and accept_delivery are currently
  // local scaffolds. Real on-chain settlement payouts are blocked because the
  // `settleway_escrow` contract only supports state transitions, not token transfers.
  // This headless hook simulates local transitions to unblock downstream UI/Reputation work.
  if (process.env.RUNTIME_MODE !== 'persistent' && process.env.NEXT_PUBLIC_RUNTIME_MODE !== 'persistent') {
    throw new Error("Headless hook requires RUNTIME_MODE=persistent");
  }
  if (process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION !== '1') {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Headless execution is gated off. Set ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1 to enable." };
  }
  if (!process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE || process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE.includes('Public Global')) {
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: "Hook refuses mainnet config" };
  }

  const repository = getAdminSmokeRepository();

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
    ((params.action === 'buyer_deposit' || params.action === 'buyer_deposit_custody' || params.action === 'accept_delivery' || params.action === 'accept_delivery_custody') && params.expectedRole !== 'buyer') ||
    ((params.action === 'seller_deposit' || params.action === 'seller_deposit_custody' || params.action === 'submit_proof' || params.action === 'submit_proof_custody' || params.action === 'mark_delivered' || params.action === 'mark_delivered_custody') && params.expectedRole !== 'seller')
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
      signer_port_factory: () => new ProfileWalletSigner(actorWallet.encrypted_secret_key, actorWallet.public_address, actorWallet.encryption_version),
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
    return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: `Escrow preparation failed: ${JSON.stringify(preparedDeal)}` };
  }

  const idempotencyKey = params.idempotencyKey || createStellarIdempotencyKey(preparedDeal.deal.id, params.actorId, params.action);
  const existingOperation = await repository.getStellarOperation(idempotencyKey);

  if (existingOperation?.operation_status === 'confirmed') {
    return { ok: true, action: params.action, actorRole: params.expectedRole, transactionHash: existingOperation.transaction_hash, nextDealStatus: preparedDeal.deal.status };
  }

  // Removed fundingRuntime composition as it's not applicable for all actions.

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
      metadata: {
        ...userRuntimeLoaded.runtime.metadata,
        contract_id: preparedDeal.deal.rail_version === 'custody_v2_testnet' ? userRuntimeLoaded.runtime.custody_contract_id : userRuntimeLoaded.runtime.contract_id
      },
      existing_operation: currentOperation,
      stellar_contract_id: preparedDeal.deal.rail_version === 'custody_v2_testnet' ? userRuntimeLoaded.runtime.custody_contract_id : userRuntimeLoaded.runtime.contract_id,
      proof_hash: params.proofHash,
      operation_timestamps: {
        created_at: timestamp,
        updated_at: timestamp,
      },
      local_commit_timestamp: timestamp,
      operation_persistence: new RepositoryStellarOperationPersistence(repository),
      deal_persistence: new RepositoryDealPersistence(repository),
      execution_adapter: userRuntimeLoaded.runtime.execution_adapter,
      reputation_persistence: repository,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (!coordinatorResult.ok) {
       return { ok: false, action: params.action, actorRole: params.expectedRole, blocker: `Coordinator execution failed: ${JSON.stringify(coordinatorResult)}` };
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
      contract_id: updatedDeal.rail_version === 'custody_v2_testnet' ? userRuntimeLoaded.runtime.custody_contract_id : userRuntimeLoaded.runtime.contract_id,
      actor_address: params.expectedRole === 'buyer' ? buyerWallet.public_address : sellerWallet.public_address,
      public_proof: params.proofHash || null,
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
