"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';

export function RoleSwitcher() {
  const [role, setRole] = useState<UserRole>('operator');

  const roles: { id: UserRole; label: string }[] = [
    { id: 'buyer', label: 'Buyer' },
    { id: 'seller', label: 'Seller' },
    { id: 'operator', label: 'Operator' },
  ];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
      {roles.map((r) => (
        <button
          key={r.id}
          onClick={() => setRole(r.id)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            role === r.id
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
