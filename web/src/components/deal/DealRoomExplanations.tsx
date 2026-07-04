'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

type ExplanationKey = 'overview' | 'funding' | 'delivery' | 'activity' | 'transaction';

interface ExplanationItem {
  key: ExplanationKey;
  label: string;
  description: string;
}

const explanations: ExplanationItem[] = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Memberikan penjelasan total transaksi, rangkuman yang harus dibayar buyer dan seller, berapa jumlah yang dipesan, dan rangkuman dari chat yang sudah di-summary oleh AI.',
  },
  {
    key: 'funding',
    label: 'Funding',
    description: 'Memberikan petunjuk apakah buyer atau seller sudah funding (deposit) atau belum.',
  },
  {
    key: 'delivery',
    label: 'Delivery & Proof',
    description: 'Tempat di mana gambar proof dan bukti pengiriman ditampilkan serta di-submit.',
  },
  {
    key: 'activity',
    label: 'Activity',
    description: 'Merangkum seluruh aktivitas di deal room, dan hal-hal apa yang harus dilakukan (menampilkan notifikasi aktivitas timeline).',
  },
  {
    key: 'transaction',
    label: 'Technical / Transaction',
    description: 'Tempat bukti transaksi (tx), hash dari Stellar, serta logika settlement ditampilkan.',
  },
];

export function DealRoomExplanations() {
  const [activeKey, setActiveKey] = useState<ExplanationKey | null>(null);

  const activeItem = explanations.find((item) => item.key === activeKey);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
      <div className="px-6 py-4 flex flex-wrap gap-8 text-sm font-semibold relative">
        {explanations.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveKey(isActive ? null : item.key)}
              className={`pb-1 transition-colors flex items-center gap-2 ${
                isActive
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              {item.label}
              <Info className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
            </button>
          );
        })}
      </div>

      {/* Expandable Explanation Panel */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          activeKey ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {activeItem && (
            <div className="bg-emerald-50 px-6 py-4 border-t border-emerald-100 flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-900 mb-1">{activeItem.label}</h4>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  {activeItem.description}
                </p>
              </div>
              <button
                onClick={() => setActiveKey(null)}
                className="text-emerald-600 hover:text-emerald-800 transition-colors"
                aria-label="Tutup penjelasan"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
