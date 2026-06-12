# Settleway

**The Safer Way to Settle Real-World Trade**

Settleway is a hackathon MVP for high-value agricultural commodity trade. It combines marketplace discovery, buyer requests, a formal Deal Room, simulated deposits, buyer/seller commitment bonds, proof/evidence workflows, two-sided reputation, and a roadmap toward Stellar/Soroban-based settlement event verification.

The goal is not to hide blockchain complexity behind hype. The goal is to make real-world trade feel safer, more structured, and more accountable for both buyers and sellers.

---

## Problem

Agricultural commodity transactions often depend on trust between parties who may not know each other well.

Common risks include:

- Sellers struggle to access serious buyers beyond local middlemen.
- Buyers risk non-delivery, inconsistent quality, or unclear fulfillment.
- Sellers risk late payment, arbitrary rejection, or unserious buyers.
- Both sides lack a clean transaction record, evidence trail, and reputation history.

For high-value commodity deals, simple chat-based negotiation is not enough.

---

## Solution

Settleway introduces a structured trade flow:

1. **Marketplace Discovery**  
   Sellers publish commodity listings such as chili, rice, coffee, or other agricultural products.

2. **Buyer Requests**  
   Buyers can post sourcing needs with target price, quantity, location, and delivery expectations.

3. **Deal Room**  
   Once both parties agree, the transaction moves into a formal Deal Room containing price, quantity, settlement terms, participants, and status.

4. **Simulated Deposits and Commitment Bonds**  
   The MVP models buyer principal deposits and buyer/seller commitment bonds to represent serious intent.

5. **Proof and Evidence Flow**  
   The product is designed to support delivery evidence, document submission, and proof hashes in later phases.

6. **Two-Sided Reputation**  
   Both buyers and sellers build trust through transaction history and behavior, not just one-sided ratings.

7. **Stellar/Soroban Roadmap**  
   Later phases plan to record key escrow and proof events on Stellar Testnet through Soroban smart contracts.

---

## Current MVP Status

The repository currently includes:

- Next.js frontend foundation.
- Marketplace listing pages.
- Buyer request pages.
- Profile and reputation pages.
- Deal Room frontend experience.
- Backend API foundation using Next.js Route Handlers.
- Supabase-ready data layer.
- In-memory mock fallback so the app can run locally without database credentials.
- Phase-gated escrow action endpoints that intentionally return `501 Not Implemented` until later phases.

Completed checkpoints:

- ✅ Phase 0: Project foundation.
- ✅ Phase 1: Frontend visual foundation.
- ✅ Phase 2: Marketplace discovery surface.
- ✅ Phase 3: Deal Room frontend experience.
- ✅ Phase 4: Backend API foundation with mock fallback.

---

## Honest Limitations

Settleway is currently a hackathon MVP, not a production financial system.

Not implemented yet:

- No real bank transfer integration.
- No real QRIS integration.
- No real payout rails.
- No real KYC/KYB.
- No production custody.
- No real dispute court or legal enforcement.
- No live Stellar/Soroban escrow integration yet.
- No real token custody yet.
- Current deposit and escrow actions are simulated or phase-gated.

The project is intentionally built in phases so the demo can prove the end-to-end trust story before adding production-grade infrastructure.

---

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js Route Handlers
- **Data Layer:** Supabase-ready architecture with mock fallback
- **Blockchain Roadmap:** Stellar Testnet and Soroban smart contracts
- **Package Manager:** npm

---

## Project Structure

```text
settleway/
  README.md
  AGENTS.md
  GEMINI.md
  docs/
  prompts/
  diagrams/
  web/
  contracts/
```

Main directories:

* `web/` — Next.js application, frontend pages, API routes, and data layer.
* `contracts/` — planned location for Stellar/Soroban smart contract work.
* `docs/` — product, technical, API, database, and architecture specifications.
* `diagrams/` — architecture and flow diagrams.
* `prompts/` — phase-based AI coding instructions.
* `AGENTS.md` — instructions for AI coding agents.
* `GEMINI.md` — operational context for Gemini/Antigravity-assisted development.

---

## Local Development

Run the web application locally:

```bash
cd web
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

Run quality checks:

```bash
npm run lint
npm run build
```

The app can run without Supabase environment variables. If Supabase credentials are missing, the backend uses the mock fallback data layer.

---

## API Smoke Tests

With the development server running, these endpoints can be tested locally:

```text
GET http://localhost:3000/api/listings
GET http://localhost:3000/api/buyer-requests
GET http://localhost:3000/api/deals/demo-cabai-001
```

Escrow mutation endpoints are intentionally phase-gated at the current stage. For example:

```bash
curl -i -X POST http://localhost:3000/api/deals/demo-cabai-001/buyer-deposit
```

Expected behavior for gated mutation endpoints:

```text
HTTP/1.1 501 Not Implemented
```

---

## Roadmap

* ✅ Phase 0: Foundation Setup
* ✅ Phase 1: Frontend Visual Foundation
* ✅ Phase 2: Marketplace Surface
* ✅ Phase 3: Deal Room Frontend
* ✅ Phase 4: Backend & Database Foundation
* ⏳ Phase 5: Off-Chain Escrow State Machine
* ⏳ Phase 6: Stellar Escrow Contract on Soroban
* ⏳ Phase 7: Backend to Stellar Integration
* ⏳ Phase 8: Proof Hash and Delivery Evidence
* ⏳ Phase 9: Reputation Integration and Demo Hardening

---

## AI-Assisted Development

This repository includes `AGENTS.md` and `GEMINI.md` to guide AI coding agents during development. These files are support documents for the build process; the product itself is Settleway.
