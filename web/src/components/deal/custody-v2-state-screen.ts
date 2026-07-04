import type {
  DbCustodyDealLink,
  DbCustodyOperation,
} from '@/lib/db/types';

export type CustodyV2ScreenKey =
  | 'not_created'
  | 'create_pending'
  | 'awaiting_acceptance'
  | 'accept_pending'
  | 'awaiting_funding'
  | 'buyer_funding_pending'
  | 'seller_funding_pending'
  | 'buyer_funded_waiting_seller'
  | 'seller_funded_waiting_buyer'
  | 'lock_confirmation_pending'
  | 'escrow_locked'
  | 'evidence_pending'
  | 'buyer_review'
  | 'settlement_pending'
  | 'settled';

export interface CustodyV2ScreenState {
  key: CustodyV2ScreenKey;
  createConfirmed: DbCustodyOperation | null;
  createSubmitted: DbCustodyOperation | null;
  acceptConfirmed: DbCustodyOperation | null;
  acceptSubmitted: DbCustodyOperation | null;
  buyerFundConfirmed: DbCustodyOperation | null;
  buyerFundSubmitted: DbCustodyOperation | null;
  sellerFundConfirmed: DbCustodyOperation | null;
  sellerFundSubmitted: DbCustodyOperation | null;
  evidenceConfirmed: DbCustodyOperation | null;
  evidenceSubmitted: DbCustodyOperation | null;
  settlementConfirmed: DbCustodyOperation | null;
  settlementSubmitted: DbCustodyOperation | null;
}

export interface CustodyV2StateFacts {
  applicationState: string;
  confirmedContractState: 'Not created' | 'TermsPending' | 'AwaitingFunding' | 'Active' | 'EvidenceSubmitted' | 'SettledSuccess';
  nextSuccessfulContractState: 'TermsPending' | 'AwaitingFunding' | 'Active' | 'EvidenceSubmitted' | 'SettledSuccess' | 'Done';
  nextResponsibleActor: 'Buyer' | 'Seller' | 'Buyer and Seller';
}

export type CustodyV2ViewerRole = 'buyer' | 'seller' | 'unmatched' | 'disconnected';

export interface CustodyV2StatusCopy {
  title: string;
  body: string;
}

export function latestCustodyOperation(
  operations: DbCustodyOperation[],
  actionType: DbCustodyOperation['action_type'],
  status?: DbCustodyOperation['status'],
): DbCustodyOperation | null {
  return operations
    .filter((operation) => operation.action_type === actionType)
    .filter((operation) => (status ? operation.status === status : true))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
}

export function resolveCustodyV2ScreenState(
  link: DbCustodyDealLink,
  operations: DbCustodyOperation[],
): CustodyV2ScreenState {
  const createConfirmed = latestCustodyOperation(operations, 'CREATE_DEAL', 'confirmed');
  const createSubmitted = latestCustodyOperation(operations, 'CREATE_DEAL', 'submitted');
  const acceptConfirmed = latestCustodyOperation(operations, 'ACCEPT_TERMS', 'confirmed');
  const acceptSubmitted = latestCustodyOperation(operations, 'ACCEPT_TERMS', 'submitted');
  const buyerFundConfirmed = latestCustodyOperation(operations, 'FUND_BUYER', 'confirmed');
  const buyerFundSubmitted = latestCustodyOperation(operations, 'FUND_BUYER', 'submitted');
  const sellerFundConfirmed = latestCustodyOperation(operations, 'FUND_SELLER', 'confirmed');
  const sellerFundSubmitted = latestCustodyOperation(operations, 'FUND_SELLER', 'submitted');
  const evidenceConfirmed = latestCustodyOperation(operations, 'SUBMIT_EVIDENCE', 'confirmed');
  const evidenceSubmitted = latestCustodyOperation(operations, 'SUBMIT_EVIDENCE', 'submitted');
  const settlementConfirmed = latestCustodyOperation(operations, 'ACCEPT_DELIVERY', 'confirmed');
  const settlementSubmitted = latestCustodyOperation(operations, 'ACCEPT_DELIVERY', 'submitted');
  const facts = {
    createConfirmed,
    createSubmitted,
    acceptConfirmed,
    acceptSubmitted,
    buyerFundConfirmed,
    buyerFundSubmitted,
    sellerFundConfirmed,
    sellerFundSubmitted,
    evidenceConfirmed,
    evidenceSubmitted,
    settlementConfirmed,
    settlementSubmitted,
  };

  if (link.latest_contract_state === 'SettledSuccess' || settlementConfirmed) {
    return { key: 'settled', ...facts };
  }
  if (settlementSubmitted && !settlementConfirmed) {
    return { key: 'settlement_pending', ...facts };
  }
  if (link.latest_contract_state === 'EvidenceSubmitted' || evidenceConfirmed) {
    return { key: 'buyer_review', ...facts };
  }
  if (evidenceSubmitted && !evidenceConfirmed) {
    return { key: 'evidence_pending', ...facts };
  }
  if (link.latest_contract_state === 'Active') {
    return { key: 'escrow_locked', ...facts };
  }
  if (buyerFundConfirmed && sellerFundConfirmed) {
    return { key: 'escrow_locked', ...facts };
  }
  if (buyerFundSubmitted && !buyerFundConfirmed) {
    return { key: 'buyer_funding_pending', ...facts };
  }
  if (sellerFundSubmitted && !sellerFundConfirmed) {
    return { key: 'seller_funding_pending', ...facts };
  }
  if (buyerFundConfirmed && !sellerFundConfirmed) {
    return { key: 'buyer_funded_waiting_seller', ...facts };
  }
  if (sellerFundConfirmed && !buyerFundConfirmed) {
    return { key: 'seller_funded_waiting_buyer', ...facts };
  }
  if (link.latest_contract_state === 'AwaitingFunding' || acceptConfirmed) {
    return { key: 'awaiting_funding', ...facts };
  }
  if (acceptSubmitted) {
    return { key: 'accept_pending', ...facts };
  }
  if (createConfirmed || (link.latest_contract_state === 'TermsPending' && link.last_reconciled_at)) {
    return { key: 'awaiting_acceptance', ...facts };
  }
  if (createSubmitted) {
    return { key: 'create_pending', ...facts };
  }
  return { key: 'not_created', ...facts };
}

export function custodyV2StateFacts(state: CustodyV2ScreenKey): CustodyV2StateFacts {
  switch (state) {
    case 'not_created':
    case 'create_pending':
      return {
        applicationState: 'Funding setup pending',
        confirmedContractState: 'Not created',
        nextSuccessfulContractState: 'TermsPending',
        nextResponsibleActor: 'Buyer',
      };
    case 'awaiting_acceptance':
    case 'accept_pending':
      return {
        applicationState: 'Seller commitment required',
        confirmedContractState: 'TermsPending',
        nextSuccessfulContractState: 'AwaitingFunding',
        nextResponsibleActor: 'Seller',
      };
    case 'awaiting_funding':
      return {
        applicationState: 'Funding window open',
        confirmedContractState: 'AwaitingFunding',
        nextSuccessfulContractState: 'Active',
        nextResponsibleActor: 'Buyer and Seller',
      };
    case 'buyer_funding_pending':
      return {
        applicationState: 'Buyer funding submitted',
        confirmedContractState: 'AwaitingFunding',
        nextSuccessfulContractState: 'Active',
        nextResponsibleActor: 'Buyer and Seller',
      };
    case 'seller_funding_pending':
      return {
        applicationState: 'Seller funding submitted',
        confirmedContractState: 'AwaitingFunding',
        nextSuccessfulContractState: 'Active',
        nextResponsibleActor: 'Buyer and Seller',
      };
    case 'buyer_funded_waiting_seller':
      return {
        applicationState: 'Buyer funded',
        confirmedContractState: 'AwaitingFunding',
        nextSuccessfulContractState: 'Active',
        nextResponsibleActor: 'Seller',
      };
    case 'seller_funded_waiting_buyer':
      return {
        applicationState: 'Seller funded',
        confirmedContractState: 'AwaitingFunding',
        nextSuccessfulContractState: 'Active',
        nextResponsibleActor: 'Buyer',
      };
    case 'lock_confirmation_pending':
      return {
        applicationState: 'Funding confirmed, lock pending',
        confirmedContractState: 'AwaitingFunding',
        nextSuccessfulContractState: 'Active',
        nextResponsibleActor: 'Buyer and Seller',
      };
    case 'escrow_locked':
      return {
        applicationState: 'Escrow locked',
        confirmedContractState: 'Active',
        nextSuccessfulContractState: 'EvidenceSubmitted',
        nextResponsibleActor: 'Seller',
      };
    case 'evidence_pending':
      return {
        applicationState: 'Delivery proof submitted',
        confirmedContractState: 'Active',
        nextSuccessfulContractState: 'EvidenceSubmitted',
        nextResponsibleActor: 'Seller',
      };
    case 'buyer_review':
      return {
        applicationState: 'Buyer review',
        confirmedContractState: 'EvidenceSubmitted',
        nextSuccessfulContractState: 'SettledSuccess',
        nextResponsibleActor: 'Buyer',
      };
    case 'settlement_pending':
      return {
        applicationState: 'Settlement submitted',
        confirmedContractState: 'EvidenceSubmitted',
        nextSuccessfulContractState: 'SettledSuccess',
        nextResponsibleActor: 'Buyer',
      };
    case 'settled':
      return {
        applicationState: 'Settled',
        confirmedContractState: 'SettledSuccess',
        nextSuccessfulContractState: 'Done',
        nextResponsibleActor: 'Buyer and Seller',
      };
  }
}


export function custodyV2StatusCopy(
  state: CustodyV2ScreenKey,
  viewerRole: CustodyV2ViewerRole,
): CustodyV2StatusCopy {
  switch (state) {
    case 'not_created':
      if (viewerRole === 'seller') {
        return {
          title: 'Waiting for buyer setup',
          body: 'The buyer must initialize the funding vault before seller funding can proceed.',
        };
      }
      return {
        title: 'Funding vault ready',
        body: 'Initialize the secure funding vault for this Deal Room before funds can be transferred.',
      };
    case 'create_pending':
      return {
        title: 'Initializing vault',
        body: 'The vault setup has been submitted and is waiting for confirmation.',
      };
    case 'awaiting_acceptance':
      return {
        title: 'Seller setup required',
        body: 'The seller must confirm the vault setup before both sides can fund their commitments.',
      };
    case 'accept_pending':
      return {
        title: 'Seller setup submitted',
        body: 'Seller setup confirmation has been submitted and is waiting for confirmation.',
      };
    case 'awaiting_funding':
      return {
        title: 'Awaiting funding',
        body: 'The secure vault is ready. Buyer and seller must now fund their commitments.',
      };
    case 'buyer_funding_pending':
      return {
        title: 'Buyer funding submitted',
        body: 'Buyer funding was submitted and is waiting for confirmation.',
      };
    case 'seller_funding_pending':
      return {
        title: 'Seller funding submitted',
        body: 'Seller funding was submitted and is waiting for confirmation.',
      };
    case 'buyer_funded_waiting_seller':
      return {
        title: 'Buyer funded',
        body: 'The buyer commitment is confirmed. The seller must fund the performance bond before escrow can lock.',
      };
    case 'seller_funded_waiting_buyer':
      return {
        title: 'Seller funded',
        body: 'The seller performance bond is confirmed. The buyer must fund principal and commitment bond before escrow can lock.',
      };
    case 'lock_confirmation_pending':
      return {
        title: 'Funding confirmed, lock pending',
        body: 'Both funding transactions are confirmed locally, but the vault has not returned Active yet. Please wait or refresh the page.',
      };
    case 'escrow_locked':
      return {
        title: 'Escrow locked',
        body: 'Both commitments are funded and the secure vault is locked. The seller can now record delivery proof.',
      };
    case 'evidence_pending':
      return {
        title: 'Delivery proof submitted',
        body: 'Seller delivery proof has been submitted and is waiting for confirmation.',
      };
    case 'buyer_review':
      return {
        title: 'Buyer review',
        body: 'Delivery proof is recorded. The buyer can now accept delivery and release settlement.',
      };
    case 'settlement_pending':
      return {
        title: 'Settlement submitted',
        body: 'Buyer acceptance has been submitted and Settleway is waiting for final settlement confirmation.',
      };
    case 'settled':
      return {
        title: 'Settled',
        body: 'The trade is complete. Settlement and outcome proof have been recorded securely.',
      };
  }
}
