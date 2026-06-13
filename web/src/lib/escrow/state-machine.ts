import { DbDeal } from '../db/types';

export type DealStatus =
  | "WAITING_DEPOSITS"
  | "BUYER_FUNDED"
  | "SELLER_FUNDED"
  | "LOCKED"
  | "PROOF_SUBMITTED"
  | "DELIVERED"
  | "COMPLETED"
  | "EXPIRED"
  | "REFUNDED"
  | "CANCELLED";

export type EscrowAction = 
  | 'buyer_deposit'
  | 'seller_deposit'
  | 'submit_proof'
  | 'mark_delivered'
  | 'accept_delivery'
  | 'expire'
  | 'refund';

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
      else if (action === 'expire') nextStatus = 'REFUNDED';
      else if (action === 'refund') nextStatus = 'REFUNDED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'SELLER_FUNDED':
      if (action === 'buyer_deposit') nextStatus = 'LOCKED';
      else if (action === 'expire') nextStatus = 'REFUNDED';
      else if (action === 'refund') nextStatus = 'REFUNDED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'LOCKED':
      if (action === 'submit_proof') nextStatus = 'PROOF_SUBMITTED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'PROOF_SUBMITTED':
      if (action === 'mark_delivered') nextStatus = 'DELIVERED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'DELIVERED':
      if (action === 'accept_delivery') nextStatus = 'COMPLETED';
      else throw new Error(`Invalid transition: ${action} from ${currentStatus}`);
      break;

    case 'COMPLETED':
    case 'EXPIRED':
    case 'REFUNDED':
    case 'CANCELLED':
      throw new Error(`Cannot transition from terminal state: ${currentStatus}`);

    default:
      throw new Error(`Unknown state: ${currentStatus}`);
  }

  return { ...deal, status: nextStatus, updated_at: new Date().toISOString() };
}
