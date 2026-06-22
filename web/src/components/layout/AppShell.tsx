import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { RoleSwitcher } from '../demo/RoleSwitcher';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)] font-sans text-[var(--text-primary)]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <RoleSwitcher />
    </div>
  );
}
