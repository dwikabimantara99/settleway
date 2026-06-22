'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyWalletAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy Stellar wallet address"
      title={copied ? 'Copied' : 'Copy wallet address'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-emerald-700"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
