import { DbDeal } from '../db/types';

export type DealStatus =
  | "WAITING_DEPOSITS"
  | "BUYER_FUNDED"
  | "SELLER_FUNDED"
  | "CUSTODY_PENDING"
  | "LOCKED"
  | "PROOF_SUBMITTED"
  | "DELIVERED"
  | "COMPLETED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "CANCELLED"
  | "DELIVERY_REJECTED"
  | "REVIEW_REQUIRED";

export type EscrowAction = 
  | 'buyer_deposit'
  | 'seller_deposit'
  | 'submit_proof'
  | 'mark_delivered'
  | 'accept_delivery'
  | 'expire'
  | 'expire_proof'
  | 'reject_delivery'
  | 'refund'
  | 'refund_sweep';

export const FUNDING_WINDOW_DEAL_STATUSES = [
  'WAITING_DEPOSITS',
  'BUYER_FUNDED',
  'SELLER_FUNDED',
  'CUSTODY_PENDING',
] as const satisfies readonly DealStatus[];

export const POST_LOCK_DEAL_STATUSES = [
  'LOCKED',
  'PROOF_SUBMITTED',
  'DELIVERED',
  'COMPLETED',
  'DELIVERY_REJECTED',
  'REVIEW_REQUIRED',
] as const satisfies readonly DealStatus[];

export const POST_PROOF_DEAL_STATUSES = [
  'PROOF_SUBMITTED',
  'DELIVERED',
  'COMPLETED',
  'DELIVERY_REJECTED',
  'REVIEW_REQUIRED',
] as const satisfies readonly DealStatus[];

export const CLOSED_DEAL_STATUSES = [
  'REFUND_PENDING',
  'REFUNDED',
  'EXPIRED',
  'CANCELLED',
] as const satisfies readonly DealStatus[];

export const TERMINAL_DEAL_STATUSES = [
  'COMPLETED',
  'EXPIRED',
  'REFUND_PENDING',
  'REFUNDED',
  'CANCELLED',
] as const satisfies readonly DealStatus[];

export function isFundingWindowDealStatus(status: DealStatus): boolean {
  return (FUNDING_WINDOW_DEAL_STATUSES as readonly DealStatus[]).includes(status);
}

export function isPreLockDealStatus(status: DealStatus): boolean {
  return isFundingWindowDealStatus(status);
}

export function isPostLockDealStatus(status: DealStatus): boolean {
  return (POST_LOCK_DEAL_STATUSES as readonly DealStatus[]).includes(status);
}

export function isPostProofDealStatus(status: DealStatus): boolean {
  return (POST_PROOF_DEAL_STATUSES as readonly DealStatus[]).includes(status);
}

export function isClosedDealStatus(status: DealStatus): boolean {
  return (CLOSED_DEAL_STATUSES as readonly DealStatus[]).includes(status);
}

export function isTerminalDealStatus(status: DealStatus): boolean {
  return (TERMINAL_DEAL_STATUSES as readonly DealStatus[]).includes(status);
}

export function lockAfterCustody(deal: DbDeal): DbDeal {
  if (deal.status !== 'CUSTODY_PENDING') {
    throw new Error(`Invalid custody lock transition from ${deal.status}`);
  }

  return {
    ...deal,
    status: 'LOCKED',
    updated_at: new Date().toISOString(),
  };
}

export function transition(deal: DbDeal, action: EscrowAction): DbDeal {
  const currentStatus = deal.status as DealStatus;
  let nextStatus: DealStatus = currentStatus;

  switch (currentStatus) {
    case 'WAITING_DEPOSITS':
      if (action === 'buyer_deposit') nextStatus = 'BUYER_FUNDED';
      else if (action === 'seller_deposit') nextStatus = 'SELLER_FUNDED';
      else if (action === 'expire') nextStatus = 'EXPIRED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'BUYER_FUNDED':
      if (action === 'seller_deposit') nextStatus = 'LOCKED';
      else if (action === 'expire') nextStatus = 'REFUND_PENDING';
      else if (action === 'refund') nextStatus = 'REFUNDED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'SELLER_FUNDED':
      if (action === 'buyer_deposit') nextStatus = 'LOCKED';
      else if (action === 'expire') nextStatus = 'REFUND_PENDING';
      else if (action === 'refund') nextStatus = 'REFUNDED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'CUSTODY_PENDING':
      throw new Error('Custody transfer must complete before escrow can lock');

    case 'LOCKED':
      if (action === 'submit_proof') nextStatus = 'PROOF_SUBMITTED';
      else if (action === 'expire_proof') nextStatus = 'REVIEW_REQUIRED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'PROOF_SUBMITTED':
      if (action === 'mark_delivered') nextStatus = 'DELIVERED';
      else if (action === 'reject_delivery') nextStatus = 'DELIVERY_REJECTED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'DELIVERED':
      if (action === 'accept_delivery') nextStatus = 'COMPLETED';
      else if (action === 'reject_delivery') nextStatus = 'DELIVERY_REJECTED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'COMPLETED':
    case 'EXPIRED':
    case 'REFUNDED':
    case 'CANCELLED':
      throw new Error(`Cannot transition from terminal state: ${currentStatus}`);

    case 'REFUND_PENDING':
      if (action === 'refund_sweep') nextStatus = 'REFUNDED';
      else throw new Error(`Cannot transition from terminal state: ${currentStatus}`);
      break;

    case 'DELIVERY_REJECTED':
    case 'REVIEW_REQUIRED':
      throw new Error(`Cannot transition directly from manual review state: ${currentStatus}`);

    default:
      throw new Error(`Unknown state: ${currentStatus}`);
  }

  return { ...deal, status: nextStatus, updated_at: new Date().toISOString() };
}
