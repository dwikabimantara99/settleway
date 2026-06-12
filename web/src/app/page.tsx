import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight, Store, Lock, FileText, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative px-6 py-24 sm:py-32 lg:px-8 bg-slate-50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-slate-50 to-white opacity-40" />
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/50 px-3 py-1 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              <ShieldCheck className="h-4 w-4" />
              Hackathon MVP Demo
            </span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            The Safer Way to Settle <br className="hidden sm:block" />
            <span className="text-emerald-600">Real-World Trade</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            Settleway connects farmers, suppliers, and buyers in a formal Deal Room. 
            Go beyond simple discovery with simulated escrow, mutual commitment bonds, 
            and verifiable proof on the Stellar Testnet.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="#marketplace-preview">
              <Button size="lg" className="gap-2">
                View Marketplace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#demo-flow">
              <Button size="lg" variant="secondary" className="gap-2">
                Open Demo Flow
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section id="marketplace-preview" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-emerald-600">Why Settleway?</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Marketplace discovery is not enough
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              High-value agricultural transactions fail due to fragile trust. Buyers fear non-delivery or poor quality. Sellers fear unpaid invoices and unfair cancellations.
            </p>
          </div>

          <div className="mx-auto max-w-2xl lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <Store className="h-5 w-5 flex-none text-emerald-600" />
                  Marketplace Access
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Find real sellers and post buyer requests. Break out of closed local networks to find the best national supply.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <Lock className="h-5 w-5 flex-none text-emerald-600" />
                  Protected Deal Room
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Both parties deposit mutual commitment bonds. Escrow locks only when both sides are funded, reducing cancellation risk.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <FileText className="h-5 w-5 flex-none text-emerald-600" />
                  Verifiable Proof
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Evidence hashes are recorded on the Stellar Testnet. Settleway builds real, two-sided reputation based on transaction outcomes.</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="demo-flow" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-emerald-600">The Workflow</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              5 Steps to Settled Trade
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { title: "1. Match", desc: "Buyer and seller agree on terms via listing or request." },
              { title: "2. Deposit", desc: "Buyer sends principal + bond. Seller sends performance bond." },
              { title: "3. Lock", desc: "Deal Room locks the escrow. Delivery begins." },
              { title: "4. Proof", desc: "Seller submits evidence. Hash recorded on Stellar." },
              { title: "5. Settle", desc: "Buyer accepts. Funds release. Reputation updates." },
            ].map((step, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <span className="text-emerald-700 font-bold">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Layer Section */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Powered by Stellar
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Blockchain shouldn&apos;t be confusing. We use Stellar Testnet as an invisible trust layer. 
            Escrow events and proof hashes are recorded immutably to guarantee the integrity of your trade history.
          </p>
          <div className="flex justify-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Event-Contract Mode
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Off-chain Simulated Fiat
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Soroban Smart Contracts
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
