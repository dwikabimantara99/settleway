import { ArrowRight, BadgeCheck, Info, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react';

function AssuranceMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <dt className="text-sm text-slate-300">{label}</dt>
      <dd
        className={`text-right font-semibold financial-figures ${
          emphasis ? 'text-lg text-white' : 'text-sm text-slate-50'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function AuroraAssuranceRail({
  principal,
  buyerBond,
  sellerBond,
  fees,
  totalExpected,
  nextActor,
  custodyState,
  verificationLabel,
  latestTxHref,
  latestTxReference,
  dealId,
  contractId,
  escrowId,
  deliveryDeadline,
  sticky = true,
}: {
  principal: string;
  buyerBond: string;
  sellerBond: string;
  fees: string;
  totalExpected: string;
  nextActor: string;
  custodyState: string;
  verificationLabel: string;
  latestTxHref?: string | null;
  latestTxReference?: string | null;
  dealId: string;
  contractId?: string | null;
  escrowId?: string | null;
  deliveryDeadline: string;
  sticky?: boolean;
}) {
  return (
    <section
      className={`aurora-assurance rounded-[1.75rem] p-6 ${sticky ? 'xl:sticky xl:top-[6rem]' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-cyan-200">
            Aurora Assurance Rail
          </div>
          <h2 className="mt-2 text-2xl font-semibold">Funding truth</h2>
        </div>
        <ShieldCheck className="h-6 w-6 text-emerald-200" />
      </div>

      <dl className="mt-6">
        <AssuranceMetric label="Buyer principal" value={principal} />
        <AssuranceMetric label="Buyer commitment bond" value={buyerBond} />
        <AssuranceMetric label="Seller performance bond" value={sellerBond} />
        <AssuranceMetric label="Platform fees" value={fees} />
        <AssuranceMetric label="Total expected" value={totalExpected} emphasis />
      </dl>

      <div className="mt-6 grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
          <div className="text-xs text-slate-300">Next responsible actor</div>
          <div className="mt-1 font-semibold text-white">{nextActor}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
          <div className="text-xs text-slate-300">Custody / lock state</div>
          <div className="mt-1 text-sm font-semibold leading-5 text-white">{custodyState}</div>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
          <div>
            <div className="text-xs font-semibold text-white">Settlement policy</div>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Before lock, a funded side receives a full refund if the counterparty misses the
              deadline. Successful settlement returns both bonds and routes principal to the
              seller.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-100/8 p-4">
        <div className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
          <div>
            <div className="text-xs font-semibold text-white">Stellar verification</div>
            <p className="mt-1 text-xs leading-5 text-slate-300">{verificationLabel}</p>
            {latestTxHref ? (
              <a
                href={latestTxHref}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs font-semibold text-cyan-200 hover:text-white"
              >
                View verified transaction
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-black/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-xs font-semibold text-white">
          <Info className="h-4 w-4 text-cyan-200" />
          Technical verification
        </summary>
        <div className="space-y-3 border-t border-white/10 px-4 py-4 text-xs text-slate-300">
          <div>
            <div className="text-slate-400">Deal ID</div>
            <div className="mt-1 break-all font-mono">{dealId}</div>
          </div>
          <div>
            <div className="text-slate-400">Contract ID</div>
            <div className="mt-1 break-all font-mono">{contractId ?? 'Pending'}</div>
          </div>
          <div>
            <div className="text-slate-400">Escrow reference</div>
            <div className="mt-1 break-all font-mono">{escrowId ?? 'Pending'}</div>
          </div>
          {latestTxReference ? (
            <div>
              <div className="text-slate-400">Latest room transaction</div>
              <div className="mt-1 break-all font-mono">{latestTxReference}</div>
            </div>
          ) : null}
        </div>
      </details>

      <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
        <ReceiptText className="h-4 w-4" />
        Delivery deadline {deliveryDeadline}
      </div>
    </section>
  );
}
