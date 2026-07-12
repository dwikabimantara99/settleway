import { FileSignature, ExternalLink } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';
import type { StellarOperation } from '@/lib/stellar/types';

interface StellarEvidencePanelProps {
  contractId: string | null;
  escrowId: string | null;
  stellarOperations: StellarOperation[];
  demoBuyerDepositTxHash?: string | null;
  demoProofHash?: string | null;
}

export function StellarEvidencePanel({ contractId, escrowId, stellarOperations, demoBuyerDepositTxHash, demoProofHash }: StellarEvidencePanelProps) {
  const getTx = (action: string) => stellarOperations.find((o) => o.requested_action === action)?.transaction_hash;

  const createTx = getTx('create_deal_custody');
  const buyerTx = getTx('buyer_deposit_custody');
  const sellerTx = getTx('seller_deposit_custody');
  const proofTx = getTx('submit_proof_custody');
  const markDeliveredTx = getTx('mark_delivered_custody');
  const settlementTx = getTx('accept_delivery_custody');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <FileSignature className="h-6 w-6 text-emerald-700" />
        <h2 className="text-xl font-semibold text-slate-950">Stellar Evidence</h2>
      </div>
      
      <div className="space-y-4 text-sm text-slate-700">
        {contractId && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Contract ID</div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">
              <span className="truncate">{contractId}</span>
              <CopyButton text={contractId} />
            </div>
          </div>
        )}
        
        {escrowId && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Escrow ID</div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">
              <span className="truncate">{escrowId}</span>
              <CopyButton text={escrowId} />
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transaction Hashes</div>
          
          {demoBuyerDepositTxHash ? (
            <>
              <TxRow label="Buyer Deposit (Testnet Anchor)" txHash={demoBuyerDepositTxHash} />
              {demoProofHash && (
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-slate-600">Proof Hash</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-[10px] text-slate-700 truncate bg-slate-50 p-1 rounded border border-slate-100">
                      {demoProofHash}
                    </div>
                    <CopyButton text={demoProofHash} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <TxRow label="Create Escrow" txHash={createTx} />
              <TxRow label="Buyer Deposit" txHash={buyerTx} />
              <TxRow label="Seller Deposit" txHash={sellerTx} />
              <TxRow label="Submit Proof" txHash={proofTx} />
              <TxRow label="Mark Delivered" txHash={markDeliveredTx} />
              <TxRow label="Settlement" txHash={settlementTx} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function TxRow({ label, txHash }: { label: string; txHash?: string | null }) {
  if (!txHash) return null;
  
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="flex items-center gap-2">
        <a 
          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex items-center gap-1 font-mono text-[10px] text-emerald-600 hover:text-emerald-700 truncate"
        >
          <span className="truncate">{txHash.slice(0, 16)}...{txHash.slice(-16)}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
        <CopyButton text={txHash} />
      </div>
    </div>
  );
}
