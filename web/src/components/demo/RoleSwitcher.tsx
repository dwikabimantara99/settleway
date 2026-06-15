"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';

export function RoleSwitcher() {
  const [role, setRole] = useState<string>('operator');
  const router = useRouter();

  useEffect(() => {
    // Check current mock_actor cookie
    const match = document.cookie.match(/(?:(?:^|.*;\s*)mock_actor\s*\=\s*([^;]*).*$)|^.*$/);
    if (match && match[1]) {
      setRole(match[1]);
    } else {
      setRole('buyer-surabaya-restaurant');
    }
  }, []);

  const roles = [
    { id: 'buyer-surabaya-restaurant', label: 'Buyer' },
    { id: 'seller-probolinggo-chili', label: 'Seller' },
    { id: 'operator', label: 'Operator' },
  ];

  const handleRoleChange = async (newRole: string) => {
    setRole(newRole);
    // Set cookie valid for session
    document.cookie = `mock_actor=${newRole}; path=/; max-age=86400`;
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
      {roles.map((r) => (
        <button
          key={r.id}
          onClick={() => handleRoleChange(r.id)}
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
