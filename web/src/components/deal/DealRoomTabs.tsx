'use client';

import { useState } from 'react';

type TabKey = 'overview' | 'funding' | 'delivery' | 'activity' | 'transaction';

interface DealRoomTabsProps {
  overviewContent: React.ReactNode;
  fundingContent: React.ReactNode;
  deliveryContent: React.ReactNode;
  activityContent: React.ReactNode;
  transactionContent: React.ReactNode;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'funding', label: 'Funding' },
  { key: 'delivery', label: 'Delivery & Proof' },
  { key: 'activity', label: 'Activity' },
  { key: 'transaction', label: 'Technical / Transaction' },
];

export function DealRoomTabs({
  overviewContent,
  fundingContent,
  deliveryContent,
  activityContent,
  transactionContent,
}: DealRoomTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  return (
    <div className="space-y-6">
      {/* Tab Navigation Menu */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap gap-8 text-sm font-semibold relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-1 transition-colors ${
                  isActive
                    ? 'border-b-2 border-emerald-600 text-emerald-700'
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tab Contents (rendered but hidden when inactive to preserve DOM for tests) */}
      <div className={activeTab === 'overview' ? 'block animate-in fade-in duration-300' : 'hidden'}>
        {overviewContent}
      </div>
      
      <div className={activeTab === 'funding' ? 'block animate-in fade-in duration-300' : 'hidden'}>
        {fundingContent}
      </div>

      <div className={activeTab === 'delivery' ? 'block animate-in fade-in duration-300' : 'hidden'}>
        {deliveryContent}
      </div>

      <div className={activeTab === 'activity' ? 'block animate-in fade-in duration-300' : 'hidden'}>
        {activityContent}
      </div>

      <div className={activeTab === 'transaction' ? 'block animate-in fade-in duration-300' : 'hidden'}>
        {transactionContent}
      </div>
    </div>
  );
}
