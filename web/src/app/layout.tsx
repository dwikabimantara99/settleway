import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Settleway - The Safer Way to Settle Real-World Trade",
  description: "A high-value agricultural trade marketplace with recorded negotiation, mutual Deal Room commitment, escrow protection, and Stellar-backed trust signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
