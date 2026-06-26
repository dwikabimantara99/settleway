import type {
  CustodyV2ContractState,
  DbCustodyDealLink,
} from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';
import type { CustodyV2ChainDeal } from './contract-reader';

const TERMINAL_STATES = new Set<CustodyV2ContractState>([
  'SettledSuccess',
  'FundingExpired',
  'SellerBreach',
  'BuyerBreach',
  'MutualCancellation',
]);

export function assertChainDealMatchesLink(input: {
  link: DbCustodyDealLink;
  chainDeal: CustodyV2ChainDeal;
}) {
  const { link, chainDeal } = input;
  const mismatches: string[] = [];
  if (chainDeal.deal_id !== link.contract_deal_id) mismatches.push('contract_deal_id');
  if (chainDeal.buyer !== link.buyer_address) mismatches.push('buyer_address');
  if (chainDeal.seller !== link.seller_address) mismatches.push('seller_address');
  if (chainDeal.mediator !== link.mediator_address) mismatches.push('mediator_address');
  if (chainDeal.accepted_asset !== link.asset_contract_id) mismatches.push('asset_contract_id');
  if (chainDeal.terms_hash !== link.terms_hash) mismatches.push('terms_hash');
  if (chainDeal.principal !== link.principal_base_units) mismatches.push('principal_base_units');
  if (chainDeal.buyer_bond !== link.buyer_bond_base_units) mismatches.push('buyer_bond_base_units');
  if (chainDeal.seller_bond !== link.seller_bond_base_units) mismatches.push('seller_bond_base_units');
  if (chainDeal.funding_deadline !== link.funding_deadline_unix) mismatches.push('funding_deadline_unix');
  if (chainDeal.delivery_deadline !== link.delivery_deadline_unix) mismatches.push('delivery_deadline_unix');
  if (chainDeal.inspection_deadline !== link.inspection_deadline_unix) mismatches.push('inspection_deadline_unix');
  if (mismatches.length > 0) {
    throw new Error(`Custody V2 chain deal does not match application link: ${mismatches.join(', ')}.`);
  }
}

export function terminalOutcomeFromChainDeal(chainDeal: CustodyV2ChainDeal): CustodyV2ContractState | null {
  return TERMINAL_STATES.has(chainDeal.state) ? chainDeal.state : null;
}

export async function applyChainCustodyProjection(input: {
  repository: IRepository;
  applicationDealId: string;
  chainDeal: CustodyV2ChainDeal;
  confirmedLedger: number | null;
  reconciledAt?: Date;
}): Promise<DbCustodyDealLink> {
  const link = await input.repository.getCustodyDealLink(input.applicationDealId);
  if (!link) throw new Error('Custody V2 deal link was not found for chain projection.');
  assertChainDealMatchesLink({ link, chainDeal: input.chainDeal });

  const updated = await input.repository.updateCustodyDealLink(input.applicationDealId, {
    latest_contract_state: input.chainDeal.state,
    latest_terminal_outcome: terminalOutcomeFromChainDeal(input.chainDeal),
    last_confirmed_ledger: input.confirmedLedger,
    last_reconciled_at: (input.reconciledAt ?? new Date()).toISOString(),
  });
  if (!updated) throw new Error('Custody V2 chain projection update failed.');
  return updated;
}
