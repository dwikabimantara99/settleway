'use client';

import { usePathname } from 'next/navigation';
import { PublicLandingHeader } from '../landing/PublicLandingHeader';
import { AuthenticatedHeader } from './AuthenticatedHeader';

export function Header() {
  const pathname = usePathname();

  if (pathname === '/') {
    return <PublicLandingHeader />;
  }

  return <AuthenticatedHeader />;
}
