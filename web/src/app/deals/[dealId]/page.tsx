import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Stepper, Step } from '@/components/ui/Stepper';
import { demoProfiles } from '@/lib/demo/demo-data';
import { ShieldCheck, Upload, FileText, CheckCircle2, ChevronLeft, Info } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getDeal } from '@/lib/db/deals';
import { DealActions } from '@/components/deal/DealActions';

export default async function DealRoomPage({ params }: { params: Promise<{ dealId: string }> }) {
  const resolvedParams = await params;
  const deal = await getDeal(resolvedParams.dealId);
  
  if (!deal) return notFound();

  const buyer = demoProfiles[deal.buyer_id];
  const seller = demoProfiles[deal.seller_id];

  const status = deal.status;
  const steps: Step[] = [
    { label: 'Waiting Deposits', status: status === 'WAITING_DEPOSITS' ? 'current' : 'complete' },
    { label: 'Deposits Locked', status: (status === 'BUYER_FUNDED' || status === 'SELLER_FUNDED') ? 'current' : (status === 'WAITING_DEPOSITS' ? 'upcoming' : 'complete') },
    { label: 'Proof Submitted', status: status === 'LOCKED' ? 'current' : (status === 'PROOF_SUBMITTED' || status === 'DELIVERED' || status === 'COMPLETED' ? 'complete' : 'upcoming') },
    { label: 'Delivered', status: status === 'PROOF_SUBMITTED' ? 'current' : (status === 'DELIVERED' || status === 'COMPLETED' ? 'complete' : 'upcoming') },
    { label: 'Settled', status: status === 'DELIVERED' ? 'current' : (status === 'COMPLETED' ? 'complete' : 'upcoming') },
  ];
  const isPostProof = status === 'PROOF_SUBMITTED' || status === 'DELIVERED' || status === 'COMPLETED';
  
  let lockedValueText = 'Rp 0';
  let helperText = 'Escrow will lock automatically when both parties have transferred their required deposits to the virtual accounts.';

  if (status === 'COMPLETED' || status === 'REFUNDED' || status === 'CANCELLED' || status === 'EXPIRED') {
    lockedValueText = 'Settled (Rp 0)';
    helperText = status === 'COMPLETED' ? 'Simulated settlement complete. Funds released.' : 'Deal cancelled or expired. Funds refunded.';
  } else if (status === 'LOCKED' || isPostProof) {
    const lockedTotal = deal.principal_idr + deal.buyer_bond_idr + deal.seller_bond_idr;
    lockedValueText = `Rp ${lockedTotal.toLocaleString('id-ID')}`;
    helperText = 'Funds are securely locked (Simulated Phase 5).';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-lg mb-4 border border-amber-200">
          <strong>Phase 5 Notice:</strong> Escrow state is simulated in-memory and will reset if the dev server reloads.
        </div>
        <Link href="/marketplace" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Marketplace
        </Link>
      </div>

      {/* Header Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{deal.commodity}</h1>
              <StatusPill status={deal.status} />
            </div>
            <p className="text-slate-600">Deal ID: <span className="font-mono text-xs bg-slate-100 p-1 rounded">{deal.id}</span></p>
          </div>
          <DealActions dealId={deal.id} status={deal.status} />
        </div>

        <div className="mt-8 md:mt-10 pb-4 md:pb-6">
          <Stepper steps={steps} className="w-full px-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Evidence Panel */}
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Delivery & Proof</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">{isPostProof ? 'Delivery Evidence' : 'Upload Delivery Evidence'}</h3>
                <p className="text-xs text-slate-500 mb-4">{isPostProof ? 'Proof milestone simulated. Real file upload and proof hashing will be added in Phase 8.' : 'Delivery evidence is planned for Phase 8. Submit Proof in Phase 5 simulates the proof milestone only.'}</p>
                <Button variant="secondary" size="sm" disabled>Select Files (Phase 8)</Button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900">Required Documents</h4>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">Waybill / Resi</div>
                      <div className="text-xs text-slate-500">{isPostProof ? 'Proof milestone simulated' : 'Upload pending for Phase 8'}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{isPostProof ? 'Simulated' : 'Phase 8'}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">Quality Inspection Photo</div>
                      <div className="text-xs text-slate-500">{isPostProof ? 'Proof milestone simulated' : 'Upload pending for Phase 8'}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{isPostProof ? 'Simulated' : 'Phase 8'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stellar Trust Panel */}
          <Card className="border-slate-800 bg-slate-900 text-slate-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Stellar Escrow Contract</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    In future phases, the Deal Room deposits and evidence hashes will be securely recorded on the Stellar Testnet via Soroban smart contracts. This guarantees immutable proof of transaction outcomes for reputation building.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-500 bg-slate-950 p-3 rounded border border-slate-800">
                    <div>
                      <span className="block text-slate-600 mb-1">Contract ID</span>
                      <span className="text-slate-300">-</span>
                    </div>
                    <div>
                      <span className="block text-slate-600 mb-1">Latest Tx</span>
                      <span className="text-slate-300">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Money Breakdown Widget */}
          <Card className="border-emerald-200 shadow-md">
            <CardHeader className="bg-emerald-50 rounded-t-xl border-b border-emerald-100 pb-4">
              <CardTitle className="text-emerald-900 text-base flex justify-between">
                <span>Value Locked</span>
                <span>{lockedValueText}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-sm">
              <div className="mb-4">
                <div className="font-semibold text-slate-900 mb-2 border-b border-slate-100 pb-1">Buyer Funds</div>
                <div className="flex justify-between text-slate-600 py-1">
                  <span>Principal</span>
                  <span>Rp {deal.principal_idr.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600 py-1">
                  <span>Bond (5%)</span>
                  <span>Rp {deal.buyer_bond_idr.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="mb-4">
                <div className="font-semibold text-slate-900 mb-2 border-b border-slate-100 pb-1">Seller Funds</div>
                <div className="flex justify-between text-slate-600 py-1">
                  <span>Bond (5%)</span>
                  <span>Rp {deal.seller_bond_idr.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{helperText}</span>
              </div>
            </CardContent>
          </Card>

          {/* Identity Widget */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm">Participants</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Buyer</div>
                <Link href={`/profiles/${buyer?.id}`} className="font-semibold text-blue-600 hover:underline block">
                  {buyer?.displayName}
                </Link>
                <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 text-blue-600" /> Reputation: {buyer?.buyerScore}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 mb-1">Seller</div>
                <Link href={`/profiles/${seller?.id}`} className="font-semibold text-emerald-600 hover:underline block">
                  {seller?.displayName}
                </Link>
                <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Reputation: {seller?.sellerScore}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
