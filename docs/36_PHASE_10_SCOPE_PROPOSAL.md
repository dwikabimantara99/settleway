# 36 - Phase 10 Scope Proposal

**Status:** PROPOSED. NOT YET ACCEPTED. IMPLEMENTATION NOT AUTHORIZED.

## 1. Discovery Evidence and Capability Map

### Product Workflows
* **Onboarding & Identity:** NOT DOCUMENTED
* **Marketplace Discovery:** IMPLEMENTED WITH LIMITATIONS (Mock data only)
* **Deal Creation:** IMPLEMENTED WITH LIMITATIONS (Mock fallback)
* **Deposit Obligations:** IMPLEMENTED AND ACCEPTED (Simulated bank)
* **Proof Submission:** IMPLEMENTED AND ACCEPTED (Simulated blob)
* **Delivery Acceptance:** IMPLEMENTED AND ACCEPTED
* **Expiry / Refund:** IMPLEMENTED AND ACCEPTED
* **Evidence Display:** IMPLEMENTED AND ACCEPTED
* **Reputation Display:** IMPLEMENTED AND ACCEPTED
* **Demo Reset:** IMPLEMENTED AND ACCEPTED
* **Dispute Handling:** NOT DOCUMENTED / EXCLUDED
* **Administrative Operations:** NOT DOCUMENTED

### Infrastructure
* **Persistence:** SIMULATED (In-memory MockStore)
* **Authentication/Authorization:** NOT DOCUMENTED (UI role switch only)
* **Object Storage:** SIMULATED (No real IPFS/S3 bucket)
* **Deployment:** DOCUMENTED BUT NOT IMPLEMENTED
* **Database Migrations:** NOT DOCUMENTED
* **Testnet Operations:** IMPLEMENTED WITH LIMITATIONS (Smoke tests pass, demo is local-only)

### Operational Readiness
* **Local Demo Readiness:** IMPLEMENTED AND ACCEPTED
* **Pilot Readiness:** NOT DOCUMENTED / GAP
* **Production Readiness:** NOT DOCUMENTED / GAP
* **Auditability:** IMPLEMENTED WITH LIMITATIONS (Stellar event proof)

## 2. Unresolved Gap Inventory

| Gap | Severity | Evidence | User Impact | Business Impact | External Dependency | Founder Decision Required | Recommended Timing |
|---|---|---|---|---|---|---|---|
| **Persistent Storage** | CRITICAL | `mock-store.ts` handles all data. | State resets on server restart. No real persistence. | App cannot be used for any real pilot or private test. | Supabase PostgreSQL | Yes (DB provider) | Immediate |
| **Authentication & AuthZ** | CRITICAL | No login. Hardcoded demo profiles. | Users cannot protect their data or identity. | No security boundaries exist between buyer/seller. | Supabase Auth or NextAuth | Yes (Identity policy) | Immediate |
| **Object Storage** | HIGH | `submit-proof` simulates a 10 MiB limit but does not store objects. | Evidence cannot be retrieved by counterparty. | Disputes/audits cannot be resolved. | Supabase Storage or IPFS | Yes (Storage provider) | Next 1-2 phases |
| **Pilot Deployment** | HIGH | Vercel deployment not performed. | App cannot be shared with external users. | Cannot validate product-market fit. | Vercel, Supabase, Stellar Testnet | Yes (Hosting & Domains) | After persistence |

## 3. Phase 10 Candidate Options

### Candidate A: Production Persistence & Identity Foundation
* **Outcome:** Replace the hackathon `mockStore` with real Supabase PostgreSQL, implement Supabase Auth, apply Row-Level Security (RLS), and execute schema migrations.
* **Reason to choose now:** Persistence and identity are absolute prerequisites for any real usage beyond a local demo.
* **Architectural complexity:** Medium. The schema is documented, but integrating Supabase across all API routes is a broad migration.

### Candidate B: Evidence Object Storage & Testnet Anchoring
* **Outcome:** Connect real IPFS or Supabase Storage for evidence blobs, and execute the actual Soroban testnet anchoring inside the core API routes instead of the simulated fallback.
* **Reason to defer:** Storing real evidence without authentication or database persistence creates orphaned objects and security risks.

### Candidate C: Pilot Deployment & Operations
* **Outcome:** Deploy to Vercel, configure production environment variables, setup basic observability (Vercel Analytics), and launch a private beta.
* **Reason to defer:** Deployment of an in-memory mock store serves no pilot purpose.

## 4. Recommended Canonical Phase 10

**SUPERVISING TECHNICAL RECOMMENDATION:** Candidate A (Production Persistence & Identity Foundation).

* **Canonical Name:** Phase 10 - Persistence and Identity Foundation
* **Rationale:** The current application state is a highly polished, fully functional local demo constrained by its transient in-memory database and lack of user identity. Before real evidence can be stored, real smart contracts invoked, or a pilot deployed, the foundational persistence layer (Supabase Postgres) and authentication layer must be established. This is the highest-leverage path to pilot readiness.

## 5. Founder-Level Decisions Required

These decisions must be made before Phase 10 implementation begins:

1. **Identity Policy:**
   * *Why it matters:* Determines onboarding friction.
   * *Recommended option:* Email/password via Supabase Auth with an initial invite-only gating mechanism.
   * *Alternatives:* Magic links, Web3 Wallet connect (requires broader UX changes).
   * *Blocker status:* BLOCKS Phase 10.
2. **Database & Infrastructure Provider:**
   * *Why it matters:* We must formally adopt Supabase for Postgres and Auth as documented in `docs/04_BACKEND_SPEC.md`.
   * *Recommended option:* Hosted Supabase.
   * *Blocker status:* BLOCKS Phase 10.

## 6. Scope Gate

* **Canonical phase name:** Phase 10 - Persistence and Identity Foundation
* **Objective:** Migrate from `mockStore` to Supabase Postgres with authenticated users.
* **User-visible outcome:** Users must log in. The role switch UI is removed or restricted to development. Data persists across reloads.
* **Technical outcome:** Supabase client initialized, schema migrated, Row-Level Security (RLS) policies applied, API routes refactored to use Supabase.
* **In-scope work:**
  * Supabase project setup (local or remote schema application).
  * Authentication UI (Login / Sign Up).
  * Supabase client integration in Next.js Server Components and API routes.
  * Migrating all `mockStore` methods to Supabase queries.
* **Out-of-scope work:** Real money movement, object storage (evidence remains simulated for now), Soroban Testnet mutation (remains mock event logic).
* **Accepted inherited limitations:** Testnet anchoring and Object Storage remain simulated until Phase 11.
* **Data model impact:** Realizes the schema in `docs/05_DATABASE_SCHEMA.md`.
* **Security boundaries:** Introduces real JWT sessions and RLS.

## 7. Macro-Batch Plan

### Batch 1: Schema and Authentication Foundation
* **Outcome:** Supabase client exists, schema is applied locally, and user login works.
* **Paths:** `web/supabase/`, `web/src/lib/db/supabase-client.ts`, `web/src/app/(auth)/`.
* **Acceptance criteria:** User can register, login, and maintain a session.

### Batch 2: Data Migration
* **Outcome:** API routes read/write to Supabase instead of `mockStore`.
* **Paths:** `web/src/app/api/**`, `web/src/lib/db/**`.
* **Acceptance criteria:** Listings, requests, deals, and escrow state persist across server restarts.

### Batch 3: Security & Cleanup
* **Outcome:** Row-Level Security applied, demo mode restricted.
* **Paths:** `web/supabase/schema.sql`, `web/src/app/demo/page.tsx`.
* **Acceptance criteria:** Users can only view/mutate their own deals. Demo UI role-switcher is deactivated in production.
