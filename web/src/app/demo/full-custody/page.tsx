"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, CheckCircle, Shield } from "lucide-react";
import Link from "next/link";

interface CustodyProof {
  corridor: string;
  contract_id: string;
  asset_contract_id: string;
  buyer_public_key: string;
  seller_public_key: string;
  balances_before: { buyer: string; seller: string };
  balances_after: { buyer: string; seller: string };
  tx_hashes: {
    deposit_buyer: string;
    deposit_seller: string;
    submit_proof: string;
    mark_delivered: string;
    settle: string;
  };
  states: Record<string, string>;
  timestamp: string;
}

export default function FullCustodyDemo() {
  const [proof, setProof] = useState<CustodyProof | null>(null);

  useEffect(() => {
    fetch("/demo/full-custody-proof.json")
      .then((res) => res.json())
      .then((data) => setProof(data))
      .catch(console.error);
  }, []);

  if (!proof) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Loading verified custody evidence...</p>
      </div>
    );
  }

  const netBuyer = parseFloat(proof.balances_after.buyer) - parseFloat(proof.balances_before.buyer);
  const netSeller = parseFloat(proof.balances_after.seller) - parseFloat(proof.balances_before.seller);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              Full Soroban Custody Proof
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Verifiable evidence of non-custodial settlement on Stellar Testnet.
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
            &larr; Back to Platform
          </Link>
        </div>

        <div className="space-y-6">
          {/* Status Panel */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Proof Verified
              </h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Corridor</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{proof.corridor}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamp</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(proof.timestamp).toLocaleString()}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Custody Contract (Testnet)</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-white break-all">
                    {proof.contract_id}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Ledger Proofs */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">On-Chain Executions</h3>
            </div>
            <div className="p-6">
              <ul className="space-y-4">
                {Object.entries(proof.tx_hashes).map(([step, hash]) => (
                  <li key={step} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                      {step.replace("_", " ")}
                    </span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono text-emerald-600 hover:text-emerald-500"
                    >
                      {hash.substring(0, 16)}...{hash.substring(hash.length - 16)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Settlement Proof */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Fund Settlement</h3>
            </div>
            <div className="p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Participant</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Initial</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Final</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Net Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
                  <tr>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Buyer</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 font-mono">{parseFloat(proof.balances_before.buyer).toFixed(2)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white font-mono">{parseFloat(proof.balances_after.buyer).toFixed(2)}</td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium font-mono ${netBuyer < 0 ? "text-red-600" : "text-green-600"}`}>
                      {netBuyer > 0 ? "+" : ""}{netBuyer.toFixed(2)} XLM
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Seller</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 font-mono">{parseFloat(proof.balances_before.seller).toFixed(2)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white font-mono">{parseFloat(proof.balances_after.seller).toFixed(2)}</td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium font-mono ${netSeller > 0 ? "text-green-600" : "text-red-600"}`}>
                      {netSeller > 0 ? "+" : ""}{netSeller.toFixed(2)} XLM
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800">
                * Note: Small differences are due to network gas fees paid by participants.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
