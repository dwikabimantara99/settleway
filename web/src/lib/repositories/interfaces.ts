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
} from '../db/types';
import type { StellarOperation } from '../stellar/types';

export interface IRepository {
  // Profiles
  getProfile(id: string): Promise<DbProfile | null>;
  updateProfile(id: string, partial: Partial<DbProfile>): Promise<void>;

  // Listings
  getListings(): Promise<DbListing[]>;
  getListing(id: string): Promise<DbListing | null>;

  // Buyer Requests
  getBuyerRequests(): Promise<DbBuyerRequest[]>;
  getBuyerRequest(id: string): Promise<DbBuyerRequest | null>;

  // Pre-deal offers
  getOffer(id: string): Promise<DbOffer | null>;
  listOffersForParticipant(participantId: string): Promise<DbOffer[]>;
  createOffer(offer: DbOffer): Promise<void>;
  updateOffer(id: string, partial: Partial<DbOffer>): Promise<void>;
  getOfferMessages(offerId: string): Promise<DbNegotiationMessage[]>;
  addOfferMessage(message: DbNegotiationMessage): Promise<void>;
  getNotifications(recipientId: string): Promise<DbNotification[]>;
  addNotification(notification: DbNotification): Promise<void>;
  markNotificationRead(id: string): Promise<void>;

  // Deals
  getDeal(id: string): Promise<DbDeal | null>;
  listDealsForParticipant(participantId: string): Promise<DbDeal[]>;
  createDeal(deal: DbDeal): Promise<void>;
  updateDeal(id: string, partial: Partial<DbDeal>): Promise<void>;
  replaceDealIfCurrent(input: { current: DbDeal; next: DbDeal }): Promise<{ replaced: boolean; deal: DbDeal | null }>;

  // Events
  getDealEvents(dealId: string): Promise<DbEscrowEvent[]>;
  addEvent(event: DbEscrowEvent): Promise<void>;

  // Stellar Operations
  getStellarOperation(key: string): Promise<StellarOperation | null>;
  createStellarOperation(operation: StellarOperation): Promise<{ created: boolean; operation: StellarOperation }>;
  updateStellarOperation(key: string, patch: Partial<Pick<StellarOperation, "operation_status" | "transaction_hash" | "result_escrow_id" | "public_error_code" | "submitted_at" | "confirmed_at" | "updated_at">>): Promise<StellarOperation | null>;
  findStellarOperationsByDeal(dealId: string): Promise<StellarOperation[]>;
  replaceStellarOperationIfCurrent(input: { current: StellarOperation; next: StellarOperation }): Promise<{ replaced: boolean; operation: StellarOperation | null }>;

  // Custody V2 application integration
  getCustodyDealLink(applicationDealId: string): Promise<DbCustodyDealLink | null>;
  getCustodyOperation(idempotencyKey: string): Promise<DbCustodyOperation | null>;
  listCustodyOperations(applicationDealId: string): Promise<DbCustodyOperation[]>;
  listCustodyEvents(contractDealId: string): Promise<DbCustodyEvent[]>;

  // Evidence
  addEvidence(evidence: DbEvidenceFile): Promise<void>;
  getEvidence(id: string): Promise<DbEvidenceFile | null>;
  getDealEvidence(dealId: string): Promise<DbEvidenceFile[]>;

  // Reputation
  appendReputationEvent(event: DbReputationEvent): Promise<{ appended: boolean; event: DbReputationEvent }>;
  appendReputationEventPair(events: DbReputationEvent[]): Promise<{ appended: boolean; events: DbReputationEvent[] }>;
  getReputationEvent(id: string): Promise<DbReputationEvent | null>;
  getParticipantReputationEvents(participantId: string): Promise<DbReputationEvent[]>;
  getDealReputationEvents(dealId: string): Promise<DbReputationEvent[]>;
}
