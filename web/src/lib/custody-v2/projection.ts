import type {
  CustodyV2ActionType,
  CustodyV2ContractState,
  DbCustodyDealLink,
  DbCustodyOperation,
} from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';

export function projectConfirmedCustodyAction(input: {
  link: DbCustodyDealLink;
  actionType: CustodyV2ActionType;
  confirmedOperations: readonly DbCustodyOperation[];
}): CustodyV2ContractState {
  switch (input.actionType) {
    case 'CREATE_DEAL':
      return 'TermsPending';
    case 'ACCEPT_TERMS':
      return 'AwaitingFunding';
    case 'FUND_BUYER':
    case 'FUND_SELLER': {
      const hasBuyer = input.confirmedOperations.some((op) => op.action_type === 'FUND_BUYER');
      const hasSeller = input.confirmedOperations.some((op) => op.action_type === 'FUND_SELLER');
      return hasBuyer && hasSeller ? 'Active' : 'AwaitingFunding';
    }
    case 'SUBMIT_EVIDENCE':
      return 'EvidenceSubmitted';
    case 'ACCEPT_DELIVERY':
      return 'SettledSuccess';
    case 'EXPIRE_FUNDING':
      return 'FundingExpired';
  }
}

export async function applyConfirmedCustodyProjection(input: {
  repository: IRepository;
  operation: DbCustodyOperation;
}): Promise<DbCustodyDealLink> {
  const link = await input.repository.getCustodyDealLink(input.operation.application_deal_id);
  if (!link) throw new Error('Custody V2 deal link was not found for projection.');
  const operations = await input.repository.listCustodyOperations(input.operation.application_deal_id);
  const confirmedOperations = operations.filter((op) => (
    op.status === 'confirmed' || op.idempotency_key === input.operation.idempotency_key
  ));
  const latestState = projectConfirmedCustodyAction({
    link,
    actionType: input.operation.action_type,
    confirmedOperations,
  });
  const updated = await input.repository.updateCustodyDealLink(input.operation.application_deal_id, {
    latest_contract_state: latestState,
    latest_terminal_outcome: ['SettledSuccess', 'FundingExpired'].includes(latestState) ? latestState : null,
    last_confirmed_ledger: input.operation.confirmed_ledger,
    last_reconciled_at: new Date().toISOString(),
  });
  if (!updated) throw new Error('Custody V2 projection update failed.');
  return updated;
}
