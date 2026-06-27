import type {
  DbCustodyDealLink,
  DbCustodyOperation,
} from '@/lib/db/types';

export type CustodyV2ScreenKey =
  | 'not_created'
  | 'create_pending'
  | 'awaiting_acceptance'
  | 'accept_pending'
  | 'awaiting_funding';

export interface CustodyV2ScreenState {
  key: CustodyV2ScreenKey;
  createConfirmed: DbCustodyOperation | null;
  createSubmitted: DbCustodyOperation | null;
  acceptConfirmed: DbCustodyOperation | null;
  acceptSubmitted: DbCustodyOperation | null;
}

export interface CustodyV2StateFacts {
  applicationState: string;
  confirmedContractState: 'Not created' | 'TermsPending' | 'AwaitingFunding';
  nextSuccessfulContractState: 'TermsPending' | 'AwaitingFunding' | 'Funding milestone deferred';
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

  if (link.latest_contract_state === 'AwaitingFunding' || acceptConfirmed) {
    return { key: 'awaiting_funding', createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  if (acceptSubmitted) {
    return { key: 'accept_pending', createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  if (createConfirmed) {
    return { key: 'awaiting_acceptance', createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  if (createSubmitted) {
    return { key: 'create_pending', createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  return { key: 'not_created', createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
}

export function custodyV2StateFacts(state: CustodyV2ScreenKey): CustodyV2StateFacts {
  switch (state) {
    case 'not_created':
    case 'create_pending':
      return {
        applicationState: 'On-chain deal not created',
        confirmedContractState: 'Not created',
        nextSuccessfulContractState: 'TermsPending',
        nextResponsibleActor: 'Buyer',
      };
    case 'awaiting_acceptance':
    case 'accept_pending':
      return {
        applicationState: 'Waiting for seller acceptance',
        confirmedContractState: 'TermsPending',
        nextSuccessfulContractState: 'AwaitingFunding',
        nextResponsibleActor: 'Seller',
      };
    case 'awaiting_funding':
      return {
        applicationState: 'Awaiting funding',
        confirmedContractState: 'AwaitingFunding',
        nextSuccessfulContractState: 'Funding milestone deferred',
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
          title: 'Waiting for buyer creation',
          body: 'The buyer must create this deal on Stellar before you can review and accept the frozen terms.',
        };
      }
      return {
        title: 'Ready for buyer creation',
        body: 'Create the Custody V2 deal on Stellar so the seller can review and accept the frozen terms.',
      };
    case 'create_pending':
      return {
        title: 'Creation submitted',
        body: 'Buyer creation has been submitted to Stellar and is waiting for confirmation.',
      };
    case 'awaiting_acceptance':
      return {
        title: 'Waiting for seller acceptance',
        body: 'The buyer created the deal on Stellar. The seller must now accept the exact same immutable terms.',
      };
    case 'accept_pending':
      return {
        title: 'Seller acceptance submitted',
        body: 'Seller acceptance has been submitted to Stellar and is waiting for confirmation.',
      };
    case 'awaiting_funding':
      return {
        title: 'Awaiting funding',
        body: 'Buyer creation and seller acceptance are confirmed. Funding actions will be enabled in Recovery Milestone 2.',
      };
  }
}
