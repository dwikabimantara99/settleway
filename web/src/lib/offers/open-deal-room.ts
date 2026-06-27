import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireOfferParticipant } from '@/lib/auth/server';
import type { ApiResult, DbOffer } from '@/lib/db/types';
import { repository } from '@/lib/repositories';
import { loadCustodyV2PublicConfig } from '@/lib/custody-v2/config';
import { freezeCustodyV2Deal } from '@/lib/custody-v2/links';
import {
  buildDealFromOffer,
  buildNotification,
  getCounterpartyId,
  hasActorOpenedRoom,
} from '@/lib/offers/helpers';

const TESTNET_PRINCIPAL_STROOPS = '1000000';
const TESTNET_BUYER_BOND_STROOPS = '100000';
const TESTNET_SELLER_BOND_STROOPS = '100000';

export interface OpenDealRoomSuccessData {
  offer: DbOffer;
  deal_id: string | null;
  redirect_to: string | null;
}

export interface OpenDealRoomRouteResult {
  status: number;
  payload: ApiResult<OpenDealRoomSuccessData>;
}

function toUnixSeconds(value: Date): number {
  return Math.floor(value.getTime() / 1000);
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function formatWalletBindingIssue(label: string): string {
  return `${label} must connect and confirm a distinct Stellar Testnet wallet before the Custody V2 Deal Room can be created.`;
}

export async function performOpenDealRoomCommitment(
  offerId: string,
): Promise<OpenDealRoomRouteResult> {
  try {
    const { offer, role, user } = await requireOfferParticipant(offerId);
    const now = new Date().toISOString();

    if (offer.active_deal_id) {
      return {
        status: 200,
        payload: createSuccessResponse(
          { offer, deal_id: offer.active_deal_id, redirect_to: `/deals/${offer.active_deal_id}` },
          { source: 'repository' },
        ),
      };
    }

    if (!offer.terms_accepted_at) {
      return {
        status: 409,
        payload: createErrorResponse(
          'PRECONDITION_REQUIRED',
          'Both parties must agree the deal terms before Open Deal Room becomes available.',
        ),
      };
    }

    if (hasActorOpenedRoom(offer, user.id) && !(offer.buyer_open_room_at && offer.seller_open_room_at)) {
      return {
        status: 200,
        payload: createSuccessResponse(
          { offer, deal_id: offer.active_deal_id, redirect_to: offer.active_deal_id ? `/deals/${offer.active_deal_id}` : null },
          { source: 'repository', idempotent: true },
        ),
      };
    }

    const updatedFields =
      role === 'buyer'
        ? { buyer_open_room_at: now }
        : { seller_open_room_at: now };

    const updatedOffer = {
      ...offer,
      ...updatedFields,
    };

    const bothOpened = Boolean(updatedOffer.buyer_open_room_at && updatedOffer.seller_open_room_at);

    if (bothOpened) {
      const dealId = `deal-${offer.id}`;
      const existingDeal = await repository.getDeal(dealId);
      const existingLink = existingDeal ? await repository.getCustodyDealLink(dealId) : null;

      if (existingDeal && existingDeal.rail_version !== 'custody_v2_testnet') {
        return {
          status: 409,
          payload: createErrorResponse(
            'LEGACY_DEAL_EXISTS',
            'This offer already has a non-Custody V2 Deal Room. Create a new offer to use Custody V2.',
          ),
        };
      }

      if (existingDeal && existingLink) {
        await repository.updateOffer(offerId, {
          ...updatedFields,
          status: 'active_escrow',
          active_deal_id: dealId,
          updated_at: now,
        });

        return {
          status: 200,
          payload: createSuccessResponse(
            {
              offer: {
                ...updatedOffer,
                status: 'active_escrow',
                active_deal_id: dealId,
                updated_at: now,
              },
              deal_id: dealId,
              redirect_to: `/deals/${dealId}`,
            },
            { source: 'repository', custody_v2: true, idempotent: true },
          ),
        };
      }

      const [buyerProfile, sellerProfile, listing, buyerRequest] = await Promise.all([
        repository.getProfile(updatedOffer.buyer_id),
        repository.getProfile(updatedOffer.seller_id),
        updatedOffer.listing_id ? repository.getListing(updatedOffer.listing_id) : Promise.resolve(null),
        updatedOffer.buyer_request_id ? repository.getBuyerRequest(updatedOffer.buyer_request_id) : Promise.resolve(null),
      ]);
      const buyerAddress = buyerProfile?.connected_wallet_address ?? null;
      const sellerAddress = sellerProfile?.connected_wallet_address ?? null;
      const buyerNetwork = buyerProfile?.connected_wallet_network ?? null;
      const sellerNetwork = sellerProfile?.connected_wallet_network ?? null;

      const walletIssues: string[] = [];
      if (!buyerAddress || buyerNetwork !== 'testnet') walletIssues.push(formatWalletBindingIssue('Buyer'));
      if (!sellerAddress || sellerNetwork !== 'testnet') walletIssues.push(formatWalletBindingIssue('Seller'));
      if (buyerAddress && sellerAddress && buyerAddress === sellerAddress) {
        walletIssues.push('Buyer and seller wallet addresses must be distinct.');
      }

      if (walletIssues.length > 0) {
        await repository.updateOffer(offerId, {
          ...updatedFields,
          status: 'awaiting_counterparty_open',
          updated_at: now,
        });

        return {
          status: 409,
          payload: createErrorResponse(
            'WALLET_BINDING_REQUIRED',
            walletIssues.join(' '),
          ),
        };
      }

      let config;
      try {
        config = loadCustodyV2PublicConfig();
      } catch (error) {
        return {
          status: 503,
          payload: createErrorResponse(
            'CUSTODY_V2_CONFIGURATION_REQUIRED',
            error instanceof Error ? error.message : String(error),
          ),
        };
      }

      if (!config.enabled) {
        return {
          status: 503,
          payload: createErrorResponse(
            'CUSTODY_V2_CONFIGURATION_REQUIRED',
            'Custody V2 is disabled. Set NEXT_PUBLIC_CUSTODY_V2_ENABLED=true and the required Testnet contract configuration.',
          ),
        };
      }

      if (!existingDeal) {
        const deal = buildDealFromOffer({
          id: dealId,
          offer: updatedOffer,
          now,
        });
        await repository.createDeal({
          ...deal,
          rail_version: 'custody_v2_testnet',
          stellar_mode: 'testnet',
          stellar_contract_id: config.contractId,
          buyer_fee_idr: 0,
          seller_fee_idr: 0,
          buyer_total_idr: deal.principal_idr + deal.buyer_bond_idr,
          seller_total_idr: deal.seller_bond_idr,
        });
      }

      const deal = await repository.getDeal(dealId);
      if (!deal) throw new Error('Deal creation failed.');
      const nowDate = new Date(now);
      await freezeCustodyV2Deal({
        repository,
        config,
        deal,
        buyerAddress: buyerAddress!,
        sellerAddress: sellerAddress!,
        mediatorAddress: config.mediatorAddress,
        principalBaseUnits: TESTNET_PRINCIPAL_STROOPS,
        buyerBondBaseUnits: TESTNET_BUYER_BOND_STROOPS,
        sellerBondBaseUnits: TESTNET_SELLER_BOND_STROOPS,
        fundingDeadlineUnix: toUnixSeconds(addHours(nowDate, 24)),
        deliveryDeadlineUnix: toUnixSeconds(addHours(nowDate, 24 * 7)),
        inspectionDeadlineUnix: toUnixSeconds(addHours(nowDate, 24 * 9)),
        qualitySpecification: updatedOffer.terms_note || 'Commercial quality agreed in the recorded negotiation.',
        deliveryDestination:
          buyerRequest?.delivery_location ||
          buyerProfile?.location ||
          listing?.location ||
          'Delivery destination agreed in the recorded negotiation.',
        requiredEvidence: ['Recent product photos', 'Delivery proof', 'Signed receipt'],
        now: nowDate,
      });

      await repository.updateOffer(offerId, {
        ...updatedFields,
        status: 'active_escrow',
        active_deal_id: dealId,
        updated_at: now,
      });

      await repository.addNotification(
        buildNotification({
          id: `notif-${Date.now()}`,
          recipientId: getCounterpartyId(updatedOffer, user.id),
          offerId,
          type: 'deal_room_activated',
          message: 'Both parties committed. The Custody V2 Deal Room is ready for buyer creation on Stellar.',
          now,
        }),
      );

      return {
        status: 200,
        payload: createSuccessResponse(
          {
            offer: {
              ...updatedOffer,
              status: 'active_escrow',
              active_deal_id: dealId,
              updated_at: now,
            },
            deal_id: dealId,
            redirect_to: `/deals/${dealId}`,
          },
          { source: 'repository' },
        ),
      };
    }

    await repository.updateOffer(offerId, {
      ...updatedFields,
      status: 'awaiting_counterparty_open',
      updated_at: now,
    });

    await repository.addNotification(
      buildNotification({
        id: `notif-${Date.now()}`,
        recipientId: getCounterpartyId(updatedOffer, user.id),
        offerId,
        type: 'counterparty_opened_room',
        message: 'Your counterpart already clicked Open Deal Room. Your confirmation will activate the escrow room.',
        now,
      }),
    );

    return {
      status: 200,
      payload: createSuccessResponse(
        {
          offer: {
            ...updatedOffer,
            status: 'awaiting_counterparty_open',
            updated_at: now,
          },
          deal_id: null,
          redirect_to: null,
        },
        { source: 'repository' },
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Offer not found' ? 404 : message === 'Unauthorized' ? 401 : 403;

    return {
      status,
      payload: createErrorResponse('ACCESS_DENIED', message),
    };
  }
}
