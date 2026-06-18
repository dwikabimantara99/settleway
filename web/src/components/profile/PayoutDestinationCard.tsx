'use client';

import { useState } from 'react';
import { Landmark, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface PayoutDestinationCardProps {
  profileId: string;
  canEdit: boolean;
  initialWalletLabel: string | null;
  initialWalletAddress: string | null;
  initialBankName: string | null;
  initialBankAccountMasked: string | null;
}

export function PayoutDestinationCard({
  profileId,
  canEdit,
  initialWalletLabel,
  initialWalletAddress,
  initialBankName,
  initialBankAccountMasked,
}: PayoutDestinationCardProps) {
  const [walletLabel, setWalletLabel] = useState(initialWalletLabel ?? '');
  const [walletAddress, setWalletAddress] = useState(initialWalletAddress ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payout_rail_preference: 'wallet',
          payout_wallet_label: walletLabel,
          payout_wallet_address: walletAddress,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? 'Unable to save payout destination.');
        return;
      }

      setStatusMessage('Wallet destination updated.');
    } catch (error) {
      setErrorMessage(`Network error: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Destination</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <p>
          Settleway keeps settlement simple for the user, then records protected transaction truth
          through Stellar. In this MVP, linked wallet payout is the only active destination rail.
        </p>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-emerald-950">
                <WalletCards className="h-4 w-4 text-emerald-700" />
                Linked wallet destination
              </div>
              <div className="mt-1 text-xs text-emerald-900">
                Buyer bond returns and seller settlement proceeds are routed here in the current
                demo boundary.
              </div>
            </div>
            <div className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-800">
              Active
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Wallet label
              </span>
              <input
                value={walletLabel}
                onChange={(event) => setWalletLabel(event.target.value)}
                disabled={!canEdit || isSaving}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Wallet address
              </span>
              <input
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                disabled={!canEdit || isSaving}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              />
            </label>
          </div>

          {canEdit ? (
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Wallet Destination'}
              </Button>
              {statusMessage ? <span className="text-xs text-emerald-800">{statusMessage}</span> : null}
            </div>
          ) : (
            <div className="mt-4 text-xs text-slate-500">
              Only the profile owner can update payout destination preferences.
            </div>
          )}

          {errorMessage ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Landmark className="h-4 w-4 text-slate-500" />
                Local bank payout
              </div>
              <div className="mt-1 text-xs text-slate-600">
                This rail stays visible for the founder-approved Web2 story, but it is not
                executable in the current MVP.
              </div>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Not live
            </div>
          </div>

          <div className="mt-3 grid gap-1 text-xs text-slate-600">
            <div>
              <span className="font-medium text-slate-700">Bank rail label:</span>{' '}
              {initialBankName ?? 'Local bank rail'}
            </div>
            <div>
              <span className="font-medium text-slate-700">Account view:</span>{' '}
              {initialBankAccountMasked ?? 'Not live in MVP'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
