import type { DbCustodyDealLink } from '@/lib/db/types';
import type { IRepository } from '@/lib/repositories';
import type { ICustodyV2AdminWriter } from '@/lib/repositories/admin-writer';
import type { CustodyV2ContractReadPort } from './contract-reader';
import { applyChainCustodyProjection } from './projection';

export interface CustodyV2ReconcileResult {
  link: DbCustodyDealLink;
  reconciled: boolean;
  warning: string | null;
}

export async function reconcileCustodyV2DealFromChain(input: {
  repository: IRepository;
  adminWriter: ICustodyV2AdminWriter;
  applicationDealId: string;
  reader: CustodyV2ContractReadPort;
  sourceAddress?: string | null;
}): Promise<CustodyV2ReconcileResult> {
  const link = await input.repository.getCustodyDealLink(input.applicationDealId);
  if (!link) throw new Error('Custody V2 deal link was not found.');

  const sourceAddress = input.sourceAddress || link.buyer_address;
  const chainDeal = await input.reader.getDeal(sourceAddress, link.contract_deal_id);

  if (!chainDeal.ok) {
    if (chainDeal.error_code === 'not_found') {
      return { link, reconciled: false, warning: null };
    }
    return {
      link,
      reconciled: false,
      warning: `Custody V2 chain reconciliation skipped: ${chainDeal.message}`,
    };
  }

  const updated = await applyChainCustodyProjection({
    repository: input.repository,
    adminWriter: input.adminWriter,
    applicationDealId: input.applicationDealId,
    chainDeal: chainDeal.value,
    confirmedLedger: chainDeal.latestLedger,
  });

  return { link: updated, reconciled: true, warning: null };
}

