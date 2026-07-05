import { IRepository } from './interfaces';
import { mockStore } from '../db/mock-store';
import type {
  DbProfile,
  DbListing,
  DbBuyerRequest,
  DbOffer,
  DbNegotiationMessage,
  DbNotification,
  DbDeal,
  DbEscrowEvent,
  DbEvidenceFile,
  DbReputationEvent,
  DbCustodyDealLink,
  DbCustodyOperation,
  DbCustodyEvent,
  DbUserWallet,
} from '../db/types';
import type { StellarOperation } from '../stellar/types';

export class MockRepositoryAdapter implements IRepository {
  async getProfile(id: string): Promise<DbProfile | null> {
    const p = mockStore.profiles.get(id);
    return p ? { ...p } : null;
  }

  async updateProfile(id: string, partial: Partial<DbProfile>): Promise<void> {
    mockStore.updateProfile(id, partial);
  }

  async getListings(): Promise<DbListing[]> {
    return Array.from(mockStore.listings.values()).map(l => ({ ...l }));
  }

  async getListing(id: string): Promise<DbListing | null> {
    const l = mockStore.listings.get(id);
    return l ? { ...l } : null;
  }

  async getBuyerRequests(): Promise<DbBuyerRequest[]> {
    return Array.from(mockStore.buyerRequests.values()).map(r => ({ ...r }));
  }

  async getBuyerRequest(id: string): Promise<DbBuyerRequest | null> {
    const r = mockStore.buyerRequests.get(id);
    return r ? { ...r } : null;
  }

  async getOffer(id: string): Promise<DbOffer | null> {
    const offer = mockStore.offers.get(id);
    return offer ? { ...offer } : null;
  }

  async listOffersForParticipant(participantId: string): Promise<DbOffer[]> {
    return Array.from(mockStore.offers.values())
      .filter((offer) => offer.buyer_id === participantId || offer.seller_id === participantId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((offer) => ({ ...offer }));
  }

  async createOffer(offer: DbOffer): Promise<void> {
    if (mockStore.offers.has(offer.id)) {
      throw new Error(`Offer ${offer.id} already exists`);
    }
    mockStore.offers.set(offer.id, { ...offer });
    mockStore.offerMessages.set(offer.id, []);
  }

  async updateOffer(id: string, partial: Partial<DbOffer>): Promise<void> {
    mockStore.updateOffer(id, partial);
  }

  async getOfferMessages(offerId: string): Promise<DbNegotiationMessage[]> {
    return mockStore.getOfferMessages(offerId);
  }

  async addOfferMessage(message: DbNegotiationMessage): Promise<void> {
    mockStore.addOfferMessage(message);
  }

  async getNotifications(recipientId: string): Promise<DbNotification[]> {
    return mockStore.getNotifications(recipientId);
  }

  async addNotification(notification: DbNotification): Promise<void> {
    mockStore.addNotification(notification);
  }

  async markNotificationRead(id: string): Promise<void> {
    mockStore.markNotificationRead(id);
  }

  async getDeal(id: string): Promise<DbDeal | null> {
    const d = mockStore.deals.get(id);
    return d ? { ...d } : null;
  }

  async listDealsForParticipant(participantId: string): Promise<DbDeal[]> {
    return Array.from(mockStore.deals.values())
      .filter((deal) => deal.buyer_id === participantId || deal.seller_id === participantId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((deal) => ({ ...deal }));
  }

  async createDeal(deal: DbDeal): Promise<void> {
    if (mockStore.deals.has(deal.id)) {
      throw new Error(`Deal ${deal.id} already exists`);
    }
    mockStore.deals.set(deal.id, { ...deal });
  }

  async updateDeal(id: string, partial: Partial<DbDeal>): Promise<void> {
    mockStore.updateDeal(id, partial);
  }

  async replaceDealIfCurrent(input: { current: DbDeal; next: DbDeal }): Promise<{ replaced: boolean; deal: DbDeal | null }> {
    return mockStore.replaceDealIfCurrent(input);
  }

  async getDealEvents(dealId: string): Promise<DbEscrowEvent[]> {
    return mockStore.getDealEvents(dealId);
  }

  async addEvent(event: DbEscrowEvent): Promise<void> {
    mockStore.addEvent(event);
  }

  async getStellarOperation(key: string): Promise<StellarOperation | null> {
    return mockStore.getStellarOperation(key);
  }

  async createStellarOperation(operation: StellarOperation): Promise<{ created: boolean; operation: StellarOperation }> {
    return mockStore.createStellarOperation(operation);
  }

  async updateStellarOperation(key: string, patch: Partial<Pick<StellarOperation, "operation_status" | "transaction_hash" | "result_escrow_id" | "public_error_code" | "submitted_at" | "confirmed_at" | "updated_at">>): Promise<StellarOperation | null> {
    return mockStore.updateStellarOperation(key, patch);
  }

  async findStellarOperationsByDeal(dealId: string): Promise<StellarOperation[]> {
    return mockStore.findStellarOperationsByDeal(dealId);
  }

  async replaceStellarOperationIfCurrent(input: { current: StellarOperation; next: StellarOperation }): Promise<{ replaced: boolean; operation: StellarOperation | null }> {
    return mockStore.replaceStellarOperationIfCurrent(input);
  }

  async getCustodyDealLink(applicationDealId: string): Promise<DbCustodyDealLink | null> {
    return mockStore.getCustodyDealLink(applicationDealId);
  }





  async getCustodyOperation(idempotencyKey: string): Promise<DbCustodyOperation | null> {
    return mockStore.getCustodyOperation(idempotencyKey);
  }





  async listCustodyOperations(applicationDealId: string): Promise<DbCustodyOperation[]> {
    return mockStore.listCustodyOperations(applicationDealId);
  }



  async listCustodyEvents(contractDealId: string): Promise<DbCustodyEvent[]> {
    return mockStore.listCustodyEvents(contractDealId);
  }




  async addEvidence(evidence: DbEvidenceFile): Promise<void> {
    mockStore.addEvidence(evidence);
  }

  async getEvidence(id: string): Promise<DbEvidenceFile | null> {
    return mockStore.getEvidence(id);
  }

  async getDealEvidence(dealId: string): Promise<DbEvidenceFile[]> {
    return mockStore.getDealEvidence(dealId);
  }

  async appendReputationEvent(event: DbReputationEvent): Promise<{ appended: boolean; event: DbReputationEvent }> {
    return mockStore.appendReputationEvent(event);
  }

  async appendReputationEventPair(events: DbReputationEvent[]): Promise<{ appended: boolean; events: DbReputationEvent[] }> {
    return mockStore.appendReputationEventPair(events);
  }

  async getReputationEvent(id: string): Promise<DbReputationEvent | null> {
    return mockStore.getReputationEvent(id);
  }

  async getParticipantReputationEvents(participantId: string): Promise<DbReputationEvent[]> {
    return mockStore.getParticipantReputationEvents(participantId);
  }

  async getDealReputationEvents(dealId: string): Promise<DbReputationEvent[]> {
    return mockStore.getDealReputationEvents(dealId);
  }
}
