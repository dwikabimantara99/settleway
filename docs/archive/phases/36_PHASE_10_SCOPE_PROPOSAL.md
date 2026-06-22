# 36 - Phase 10 Scope Proposal

**Status:** PROPOSED FOR CONDITIONAL IMPLEMENTATION.

## 1. Discovery Evidence and Capability Map

### Capability Map: Documented Target vs. Current vs. Phase 10
* **Onboarding & Identity:** 
  * *Documented Target:* Identity system distinguishing buyers from sellers.
  * *Current:* `NOT DOCUMENTED` explicitly in PRD, hardcoded demo roles.
  * *Phase 10 Target:* Server-side authenticated identity boundary.
* **Authentication/Authorization:**
  * *Documented Target:* Distinct boundaries between roles.
  * *Current:* Role selector dropdown (UI only).
  * *Phase 10 Target:* Server-side derived roles, authenticated sessions.
* **Persistence:**
  * *Documented Target:* Supabase PostgreSQL.
  * *Current:* SIMULATED (`mockStore.ts`).
  * *Phase 10 Target:* Supabase Repository Adapter (additive).
* **Testnet Operations:**
  * *Current:* IMPLEMENTED WITH LIMITATIONS (Smoke tests passed, demo is mock).
  * *Phase 10 Target:* Unchanged. Phase 7 Testnet anchoring remains intact and separate.
* **Object Storage:** SIMULATED (No real IPFS/S3 bucket)
* **Deployment:** DOCUMENTED BUT NOT IMPLEMENTED

## 2. Canonical Identity Policy (Supervising Recommendation)
* **Pilot access:** INVITE ONLY
* **Primary identity:** VERIFIED EMAIL
* **Authentication Method:** EMAIL AND PASSWORD
* **Public self-service signup:** DISABLED
* **Wallet-based login:** OUT OF SCOPE
* **Client role selector:** DEMO MODE ONLY
* **Runtime participant role:** DERIVED FROM SERVER-SIDE MEMBERSHIP AND DEAL DATA

## 3. Provider Classification & Dependency Gate
* **Provider Classification:** DOCUMENTED PROVIDER (Supabase).
* **Dependency Gate:** PASS (`@supabase/supabase-js` exists in `package.json`).

## 4. Phase 10 Scope: Persistent Identity and Authorization Foundation

**Objective:** Establish a clean data-access, authenticated identity, and authorization foundation so Settleway can later activate persistent pilot infrastructure without rewriting application workflows or weakening demo determinism.

**In Scope:**
* Canonical identity and onboarding policy via server-side boundaries.
* Repository/data-access interfaces.
* MockStore adapter retained for deterministic tests and demo.
* Supabase-backed adapter.
* Additive SQL schema/migration files.
* RLS policy definitions.
* Typed domain-to-database mapping.
* Route migration through repository interfaces.
* Minimal authentication UI.
* Production-mode role-switch removal or isolation.
* Deterministic tests.
* Explicit environment-mode selection.

**Out of Scope:**
* Evidence blob storage.
* Production deployment.
* Live remote migration execution.
* Hosted project creation.
* Public signup.
* Live hosted persistence verification.
* Phase 11 work.

**Required Retained Modes:**
* **test:** Mock adapter
* **demo:** Mock adapter with deterministic seed/reset
* **persistent runtime:** Supabase adapter, enabled only through explicit configuration. No silent fallback to MockStore in production.

## 5. Local vs External Verification Matrix
* **Locally Verified:** Repository abstractions, Mock adapter contract, Supabase adapter query construction, domain-row mapping, SQL schema existence, RLS policy existence, Auth boundary (via injected mocks).
* **External Provisioning Not Performed:** Hosted Supabase project, remote migration, live RLS verification, live email delivery verification, live persistent restart verified.

## 6. Macro-Batch Plan
* **Batch 1: Data Access & Schema Foundation:** Domain repository interfaces, MockStore adapter, Supabase adapter, environment-explicit selection, additive SQL schema.
* **Batch 2: Identity & Auth Foundation:** Canonical auth abstraction, server-side identity resolution, RLS policy definitions, minimal Auth UI.
* **Batch 3: Route Integration & Acceptance:** Migrate API routes to use repositories. Validate security properties.

## 7. Hard Stops
Implementation will stop if identity policy remains materially undefined, required dependencies are missing, or live provisioning/destructive migrations are required.
