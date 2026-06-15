'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RefreshCcw, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleReset = async () => {
    setLoading(true);
    setStatus('idle');
    setErrorMessage('');
    
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to reset demo data');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Guided Demo Dashboard</h1>
        <p className="text-slate-600">
          Use this dashboard to reset the Settleway MVP state to its clean starting point 
          before running the hackathon presentation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Demo Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleReset} 
              disabled={loading}
              className="w-full justify-between"
              variant="secondary"
            >
              Reset Demo State
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {status === 'success' && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                Demo state reset successfully.
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col gap-1 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Reset failed
                </div>
                <div className="text-red-500 text-xs">{errorMessage}</div>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-100">
              <Button 
                onClick={() => router.push('/')} 
                className="w-full justify-between"
              >
                Start Demo Flow
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Demo Script Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-sm text-slate-600">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Target Duration: 3-5 minutes</h3>
                <p><strong>Commodity:</strong> Red chili / cabai rawit merah</p>
                <p><strong>Seller:</strong> Probolinggo Chili Supplier</p>
                <p><strong>Buyer:</strong> Surabaya Restaurant Group</p>
                <p><strong>Deal value:</strong> IDR 20,000,000</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Step-by-step Flow:</h3>
                <ol className="list-decimal list-inside space-y-2 ml-1">
                  <li><strong>Landing Page:</strong> Explain marketplace discovery limits.</li>
                  <li><strong>Marketplace:</strong> Click chili listing, view seller reputation.</li>
                  <li><strong>Deal Room:</strong> Open &quot;demo-cabai-001&quot; deal, show money breakdown.</li>
                  <li><strong>Deposit:</strong> Switch role to Buyer, simulate deposit. Switch to Seller, simulate deposit.</li>
                  <li><strong>Escrow:</strong> Escrow becomes LOCKED.</li>
                  <li><strong>Proof:</strong> Seller submits delivery evidence (simulate receipt photo). Hash is generated.</li>
                  <li><strong>Settlement:</strong> Buyer accepts delivery. Settlement completes.</li>
                  <li><strong>Review:</strong> Show Stellar event identifiers and updated public reputation.</li>
                </ol>
              </div>

              <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-1">Final Pitch Line</h3>
                <p className="italic">
                  &quot;Settleway helps real commodity sellers and buyers move from discovery to settlement with escrow, proof, and reputation that can be verified.&quot;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
