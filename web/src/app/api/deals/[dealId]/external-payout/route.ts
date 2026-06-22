import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { createEvent } from '@/lib/escrow/events';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeExternalWalletPayouts } from '@/lib/stellar/testnet-external-payout';

async function resolveConnectedWalletDestinations(deal: {
  buyer_id: string;
  seller_id: string;
}) {
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

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  try {
    let auth;
    try {
      auth = await requireDealParticipant(dealId);
    } catch (error: unknown) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', error instanceof Error ? error.message : String(error)),
        { status: 401 },
      );
    }

    const deal = auth.deal;
    if (deal.stellar_mode !== 'testnet') {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'External wallet payout is only available for Testnet rooms.'),
        { status: 400 },
      );
    }
    if (deal.status !== 'COMPLETED') {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'External wallet payout requires a completed room.'),
        { status: 400 },
      );
    }
    if (!deal.latest_stellar_tx_hash) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'External wallet payout requires a settlement transaction.'),
        { status: 400 },
      );
    }

    const existingEvents = await repository.getDealEvents(dealId);
    const existingPayoutEvent = existingEvents.find(
      (event) => event.event_type === 'external_payout_confirmed' && event.tx_hash,
    );
    if (existingPayoutEvent?.tx_hash) {
      return NextResponse.json(
        createSuccessResponse({
          deal,
          external_payout_transaction_hash: existingPayoutEvent.tx_hash,
          reused_existing_payout: true,
        }),
      );
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'External wallet payout is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    let destinations;
    try {
      destinations = await resolveConnectedWalletDestinations(deal);
    } catch (error) {
      return NextResponse.json(
        createErrorResponse(
          'BAD_REQUEST',
          error instanceof Error ? error.message : 'Connected wallet destination is not ready.',
        ),
        { status: 400 },
      );
    }

    let payout;
    try {
      payout = await executeExternalWalletPayouts({
        deal,
        buyerConnectedAddress: destinations.buyerConnectedAddress,
        sellerConnectedAddress: destinations.sellerConnectedAddress,
        signer: runtimeLoaded.runtime.signer_port,
        custodyAddress: runtimeLoaded.runtime.metadata.admin_address,
        buyerManagedAddress: runtimeLoaded.runtime.metadata.buyer_demo_address,
        sellerManagedAddress: runtimeLoaded.runtime.metadata.seller_demo_address,
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

    const event = createEvent(
      dealId,
      'external_payout_confirmed',
      auth.user.id,
      'Settleway forwarded the completed settlement from managed profile wallets to the connected Freighter wallets.',
      {
        settlement_transaction_hash: deal.latest_stellar_tx_hash,
        payout_route: 'managed_profile_wallets_to_connected_wallets',
        custody_address: payout.custodyAddress,
        buyer_managed_wallet_address: payout.buyerManagedAddress,
        seller_managed_wallet_address: payout.sellerManagedAddress,
        buyer_connected_wallet_address: payout.buyerConnectedAddress,
        seller_connected_wallet_address: payout.sellerConnectedAddress,
        buyer_bond_return_xlm: payout.buyerBondReturnXlm,
        seller_payout_xlm: payout.sellerPayoutXlm,
        asset_code: payout.assetCode,
      },
    );
    event.tx_hash = payout.transactionHash;
    await repository.addEvent(event);

    return NextResponse.json(
      createSuccessResponse({
        deal,
        external_payout_transaction_hash: payout.transactionHash,
        buyer_connected_wallet_address: payout.buyerConnectedAddress,
        seller_connected_wallet_address: payout.sellerConnectedAddress,
        buyer_bond_return_xlm: payout.buyerBondReturnXlm,
        seller_payout_xlm: payout.sellerPayoutXlm,
        reused_existing_payout: false,
      }),
    );
  } catch (error: unknown) {
    return NextResponse.json(
      createErrorResponse('BAD_REQUEST', error instanceof Error ? error.message : String(error)),
      { status: 400 },
    );
  }
}
