import { NextResponse } from 'next/server';
import { repository, runtimeMode } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { processReputationOutcome } from '@/lib/reputation/engine';
import {
  loadDealRoomTestnetRuntime,
  type DealRoomTestnetRuntime,
} from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeConfirmedDealRoomRouteAction } from '@/lib/stellar/server/deal-room-route-execution';
import {
  createProfilePayoutDestinationSnapshot,
  createWalletPayoutDestinationSnapshot,
} from '@/lib/payout-destinations';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';
import { executeSuccessSettlement } from '@/lib/stellar/testnet-settlement';
import { executeExternalWalletPayouts } from '@/lib/stellar/testnet-external-payout';
import { rejectLegacyActionForCustodyV2 } from '@/lib/deals/rail-guards';

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

async function resolveConnectedWalletDestinations(deal: DbDeal) {
  const [buyerProfile, sellerProfile] = await Promise.all([
    repository.getProfile(deal.buyer_id),
    repository.getProfile(deal.seller_id),
  ]);

  if (
    !buyerProfile?.connected_wallet_address ||
    buyerProfile.connected_wallet_network !== 'testnet'
  ) {
    throw new Error('Buyer must connect a Stellar Testnet wallet before external payout.');
  }
  if (
    !sellerProfile?.connected_wallet_address ||
    sellerProfile.connected_wallet_network !== 'testnet'
  ) {
    throw new Error('Seller must connect a Stellar Testnet wallet before external payout.');
  }

  return {
    buyerConnectedAddress: buyerProfile.connected_wallet_address,
    sellerConnectedAddress: sellerProfile.connected_wallet_address,
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

async function persistCustodyWalletAcceptance(input: {
  dealId: string;
  existingDeal: DbDeal;
  actorId: string;
  transactionHash: string;
  custodyAddress: string;
  buyerManagedAddress: string;
  sellerManagedAddress: string;
  buyerBondReturnXlm: string;
  sellerPayoutXlm: string;
  platformFeeRetainedXlm: string;
  assetCode: string;
  externalPayoutTransactionHash?: string;
  buyerConnectedAddress?: string;
  sellerConnectedAddress?: string;
  externalBuyerBondReturnXlm?: string;
  externalSellerPayoutXlm?: string;
}) {
  const nextDeal = {
    ...transition(input.existingDeal, 'accept_delivery'),
    latest_stellar_tx_hash: input.transactionHash,
    stellar_sync_status: 'idle' as const,
  };

  const replaced = await repository.replaceDealIfCurrent({
    current: input.existingDeal,
    next: nextDeal,
  });

  let updatedDeal = replaced.deal ?? nextDeal;
  if (!replaced.replaced) {
    const currentDeal = await repository.getDeal(input.existingDeal.id);
    if (
      currentDeal?.status === 'COMPLETED' &&
      currentDeal.latest_stellar_tx_hash === input.transactionHash
    ) {
      updatedDeal = currentDeal;
    } else if (
      runtimeMode === 'demo' &&
      currentDeal &&
      JSON.stringify(currentDeal) === JSON.stringify(input.existingDeal)
    ) {
      await repository.updateDeal(input.existingDeal.id, {
        status: nextDeal.status,
        latest_stellar_tx_hash: nextDeal.latest_stellar_tx_hash,
        stellar_sync_status: nextDeal.stellar_sync_status,
        updated_at: nextDeal.updated_at,
      });
      const recoveredDeal = await repository.getDeal(input.existingDeal.id);
      if (!recoveredDeal) {
        return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
      }
      updatedDeal = recoveredDeal;
    } else {
      return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    }
  }

  const settlementReference = input.transactionHash;
  const settledAt = new Date().toISOString();
  const payoutMetadata = await buildCompletionPayoutMetadata(updatedDeal);
  const existingEvents = await repository.getDealEvents(input.dealId);
  const hasAcceptanceEvent = existingEvents.some(
    (event) =>
      event.event_type === 'accept_delivery' &&
      event.tx_hash === input.transactionHash,
  );

  if (!hasAcceptanceEvent) {
    const event = createEvent(
      input.dealId,
      'accept_delivery',
      input.actorId,
      'Buyer confirmed receipt. Settleway released the successful settlement from custody to the managed profile wallets on Stellar Testnet.',
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
        settlement_route: 'settleway_custody_to_managed_profile_wallets',
        custody_address: input.custodyAddress,
        buyer_managed_wallet_address: input.buyerManagedAddress,
        seller_managed_wallet_address: input.sellerManagedAddress,
        buyer_bond_return_xlm: input.buyerBondReturnXlm,
        seller_payout_xlm: input.sellerPayoutXlm,
        platform_fee_retained_xlm: input.platformFeeRetainedXlm,
        asset_code: input.assetCode,
        external_payout_transaction_hash: input.externalPayoutTransactionHash,
        buyer_connected_wallet_address: input.buyerConnectedAddress,
        seller_connected_wallet_address: input.sellerConnectedAddress,
        external_buyer_bond_return_xlm: input.externalBuyerBondReturnXlm,
        external_seller_payout_xlm: input.externalSellerPayoutXlm,
        delivery_transaction_hash: input.existingDeal.latest_stellar_tx_hash,
        ...payoutMetadata,
      },
    );
    event.tx_hash = input.transactionHash;
    await repository.addEvent(event);
  }

  await processReputationOutcome(repository, {
    deal_id: updatedDeal.id,
    buyer_id: updatedDeal.buyer_id,
    seller_id: updatedDeal.seller_id,
    reputation_outcome: 'transaction_completed',
    principal_idr: updatedDeal.principal_idr,
    transaction_hash: input.transactionHash,
    proof_hash: updatedDeal.proof_hash,
    settlement_reference: settlementReference,
    settled_at: settledAt,
    local_terminal_outcome_persisted: true,
    operation_status: 'confirmed',
    sync_status: updatedDeal.stellar_sync_status,
  }, () => globalThis.crypto.randomUUID());

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

async function runCustodyWalletAcceptance(input: {
  dealId: string;
  existingDeal: DbDeal;
  actorId: string;
  runtime: DealRoomTestnetRuntime;
}) {
  if (
    input.existingDeal.status !== 'DELIVERED' ||
    !input.existingDeal.proof_hash ||
    !input.existingDeal.latest_stellar_tx_hash
  ) {
    return NextResponse.json(
      createErrorResponse(
        'STELLAR_EXECUTION_INVALID',
        'Buyer acceptance requires a delivered custody room with confirmed delivery proof.',
      ),
      { status: 400 },
    );
  }

  const existingEvents = await repository.getDealEvents(input.dealId);
  const existingAcceptanceEvent = existingEvents.find(
    (event) => event.event_type === 'accept_delivery' && event.tx_hash,
  );

  if (existingAcceptanceEvent?.tx_hash) {
    return persistCustodyWalletAcceptance({
      dealId: input.dealId,
      existingDeal: input.existingDeal,
      actorId: input.actorId,
      transactionHash: existingAcceptanceEvent.tx_hash,
      custodyAddress: String(existingAcceptanceEvent.metadata?.custody_address ?? input.runtime.metadata.admin_address),
      buyerManagedAddress: String(existingAcceptanceEvent.metadata?.buyer_managed_wallet_address ?? input.runtime.metadata.buyer_demo_address),
      sellerManagedAddress: String(existingAcceptanceEvent.metadata?.seller_managed_wallet_address ?? input.runtime.metadata.seller_demo_address),
      buyerBondReturnXlm: String(existingAcceptanceEvent.metadata?.buyer_bond_return_xlm ?? ''),
      sellerPayoutXlm: String(existingAcceptanceEvent.metadata?.seller_payout_xlm ?? ''),
      platformFeeRetainedXlm: String(existingAcceptanceEvent.metadata?.platform_fee_retained_xlm ?? ''),
      assetCode: String(existingAcceptanceEvent.metadata?.asset_code ?? 'XLM'),
      externalPayoutTransactionHash: typeof existingAcceptanceEvent.metadata?.external_payout_transaction_hash === 'string'
        ? existingAcceptanceEvent.metadata.external_payout_transaction_hash
        : undefined,
      buyerConnectedAddress: typeof existingAcceptanceEvent.metadata?.buyer_connected_wallet_address === 'string'
        ? existingAcceptanceEvent.metadata.buyer_connected_wallet_address
        : undefined,
      sellerConnectedAddress: typeof existingAcceptanceEvent.metadata?.seller_connected_wallet_address === 'string'
        ? existingAcceptanceEvent.metadata.seller_connected_wallet_address
        : undefined,
      externalBuyerBondReturnXlm: typeof existingAcceptanceEvent.metadata?.external_buyer_bond_return_xlm === 'string'
        ? existingAcceptanceEvent.metadata.external_buyer_bond_return_xlm
        : undefined,
      externalSellerPayoutXlm: typeof existingAcceptanceEvent.metadata?.external_seller_payout_xlm === 'string'
        ? existingAcceptanceEvent.metadata.external_seller_payout_xlm
        : undefined,
    });
  }

  let settlement;
  try {
    settlement = await executeSuccessSettlement({
      deal: input.existingDeal,
      signer: input.runtime.signer_port,
      custodyAddress: input.runtime.metadata.admin_address,
      buyerManagedAddress: input.runtime.metadata.buyer_demo_address,
      sellerManagedAddress: input.runtime.metadata.seller_demo_address,
    });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        'STELLAR_EXECUTION_FAILED',
        error instanceof Error
          ? error.message
          : 'The Stellar Testnet success settlement could not be confirmed.',
      ),
      { status: 502 },
    );
  }

  let externalPayout;
  try {
    const destinations = await resolveConnectedWalletDestinations(input.existingDeal);
    externalPayout = await executeExternalWalletPayouts({
      deal: {
        ...input.existingDeal,
        status: 'COMPLETED',
        latest_stellar_tx_hash: settlement.transactionHash,
      },
      buyerConnectedAddress: destinations.buyerConnectedAddress,
      sellerConnectedAddress: destinations.sellerConnectedAddress,
      signer: input.runtime.signer_port,
      custodyAddress: settlement.custodyAddress,
      buyerManagedAddress: settlement.buyerManagedAddress,
      sellerManagedAddress: settlement.sellerManagedAddress,
    });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        'STELLAR_EXECUTION_FAILED',
        error instanceof Error
          ? error.message
          : 'The Stellar Testnet external wallet payout could not be confirmed.',
      ),
      { status: 502 },
    );
  }

  return persistCustodyWalletAcceptance({
    dealId: input.dealId,
    existingDeal: input.existingDeal,
    actorId: input.actorId,
    transactionHash: settlement.transactionHash,
    custodyAddress: settlement.custodyAddress,
    buyerManagedAddress: settlement.buyerManagedAddress,
    sellerManagedAddress: settlement.sellerManagedAddress,
    buyerBondReturnXlm: settlement.buyerBondReturnXlm,
    sellerPayoutXlm: settlement.sellerPayoutXlm,
    platformFeeRetainedXlm: settlement.platformFeeRetainedXlm,
    assetCode: settlement.assetCode,
    externalPayoutTransactionHash: externalPayout.transactionHash,
    buyerConnectedAddress: externalPayout.buyerConnectedAddress,
    sellerConnectedAddress: externalPayout.sellerConnectedAddress,
    externalBuyerBondReturnXlm: externalPayout.buyerBondReturnXlm,
    externalSellerPayoutXlm: externalPayout.sellerPayoutXlm,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'accept_delivery' as EscrowAction;

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

    if (existingDeal.stellar_mode !== 'testnet') {
      return runLegacyLocalAcceptance(dealId, existingDeal, authUser.id);
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Buyer acceptance is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    if (existingDeal.stellar_escrow_id === null) {
      return runCustodyWalletAcceptance({
        dealId,
        existingDeal,
        actorId: authUser.id,
        runtime: runtimeLoaded.runtime,
      });
    }

    const executionResult = await executeConfirmedDealRoomRouteAction({
      action: 'accept_delivery',
      action_label: 'buyer acceptance',
      deal: existingDeal,
      runtime: runtimeLoaded.runtime,
    });
    if (!executionResult.ok) {
      return NextResponse.json(
        createErrorResponse(executionResult.failure.code, executionResult.failure.message),
        { status: executionResult.failure.status },
      );
    }

    const updatedDeal = executionResult.deal;
    const settlementReference =
      updatedDeal.latest_stellar_tx_hash ??
      (updatedDeal.proof_hash ? `proof:${updatedDeal.proof_hash}` : `room-settlement:${updatedDeal.id}`);
    const settledAt = new Date().toISOString();
    const payoutMetadata = await buildCompletionPayoutMetadata(updatedDeal);

    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Buyer confirmed receipt through the protected Testnet-backed room path. Completion and reputation closure now share the same trust trail.',
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
        contract_id: runtimeLoaded.runtime.contract_id,
        actor_address: runtimeLoaded.runtime.metadata.buyer_demo_address,
        ...payoutMetadata,
      },
    );
    event.tx_hash = executionResult.operation.transaction_hash;
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
