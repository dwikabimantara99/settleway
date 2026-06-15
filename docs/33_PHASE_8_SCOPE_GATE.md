# Phase 8 Decision and Scope Gate

## Decision Metadata
- **Gate Decision:** CONDITIONAL GO FOR PHASE 8 AUTHORIZATION
- **Phase 8 Definition:** Proof and Reputation
- **Authorization Status:** NOT YET AUTHORIZED

## Authoritative Definition
- **Phase 8:** Proof and Reputation
- **Documented Objective:** Complete the trust story. (DOCUMENTED REQUIREMENT)

## Evidence Semantics
- A SHA-256 hash is an integrity fingerprint for a specific byte sequence. It supports later byte-for-byte verification when the original evidence is available, but it does not independently prove authenticity, truthfulness, delivery, or absence of fraud. (SUPERVISING TECHNICAL DECISION)
- Phase 8 evidence is defined strictly as **hash-addressed evidence metadata** or a **verifiable evidence reference**. (SUPERVISING TECHNICAL DECISION)
- Evidence storage limitation: The raw file is not persisted, not uploaded to cloud storage, and not committed to Git. The UI must clearly disclose that only the integrity fingerprint and metadata are recorded. (SUPERVISING TECHNICAL DECISION)

## Reputation Semantics
- Reputation must not be directly editable by users or client requests. (DOCUMENTED REQUIREMENT)
- Reputation must be based on immutable or append-only reputation events. (ARCHITECTURAL INFERENCE)
- Profile aggregates are derived projections, not the primary source of truth. (SUPERVISING TECHNICAL DECISION)
- The required conceptual model is: `authoritative persisted terminal deal outcome → deterministic reputation rule → idempotent reputation event → aggregate reputation projection`. (SUPERVISING TECHNICAL DECISION)

## Product Outcome
- **User Outcome:** Buyers and sellers gain a quantifiable trust score reflecting their history of successful or failed escrow transactions. (DOCUMENTED REQUIREMENT)
- **Business Outcome:** Settleway fulfills its promise as a high-value agricultural commodity marketplace where participant behavior is immutably verifiable. (DOCUMENTED REQUIREMENT)
- **Technical Milestone:** Full closure of the deal lifecycle where the state machine's terminal states securely trigger cross-domain side effects (reputation aggregation and event logging). (ARCHITECTURAL INFERENCE)

## Required Scope
### Evidence domain foundation
* Canonical evidence metadata type. (ARCHITECTURAL INFERENCE)
* SHA-256 byte hashing abstraction. (DOCUMENTED REQUIREMENT)
* Authoritative server verification. (SUPERVISING TECHNICAL DECISION)
* Deterministic metadata persistence. (ARCHITECTURAL INFERENCE)
* Evidence ownership and deal authorization. (ARCHITECTURAL INFERENCE)
* Explicit disclosure that raw storage is not provided. (DOCUMENTED REQUIREMENT)

### Reputation domain foundation
* Append-only reputation event model. (ARCHITECTURAL INFERENCE)
* Deterministic reputation rules based on documented outcomes. (DOCUMENTED REQUIREMENT)
* Rule versioning. (SUPERVISING TECHNICAL DECISION)
* Idempotency identity. (SUPERVISING TECHNICAL DECISION)
* Aggregate projection. (ARCHITECTURAL INFERENCE)
* Rebuildability from events. (SUPERVISING TECHNICAL DECISION)
* Prohibition of direct client-controlled score writes. (DOCUMENTED REQUIREMENT)

### Integration
* Connect evidence submission to the existing canonical `submit_proof` workflow without modifying Phase 7 transaction safety. (DOCUMENTED REQUIREMENT)
* Connect reputation generation to persisted authoritative terminal outcomes. (ARCHITECTURAL INFERENCE)
* Preserve `unknown`, `submitted`, and `out_of_sync` semantics. (DOCUMENTED REQUIREMENT)
* Prevent duplicate business effects. (SUPERVISING TECHNICAL DECISION)

### User experience
* Deal Room evidence panel. (DOCUMENTED REQUIREMENT)
* Evidence hash and metadata presentation. (DOCUMENTED REQUIREMENT)
* Accurate hash-only storage disclosure. (DOCUMENTED REQUIREMENT)
* Reputation aggregate presentation. (DOCUMENTED REQUIREMENT)
* Loading, error, retry, duplicate, and reconciliation-safe behavior. (DOCUMENTED REQUIREMENT)

## Supporting Scope
* MockStore persistence primitives. (DOCUMENTED REQUIREMENT)
* Repository interfaces. (ARCHITECTURAL INFERENCE)
* Supabase-ready boundaries. (ARCHITECTURAL INFERENCE)
* API contract extension only where needed. (ARCHITECTURAL INFERENCE)
* Deterministic test fixtures. (DOCUMENTED REQUIREMENT)

## Explicitly Out of Scope
* Soroban contract modification. (OUT OF SCOPE)
* Stellar adapter modification. (OUT OF SCOPE)
* Live Testnet mutation. (OUT OF SCOPE)
* Real Supabase Storage, S3, IPFS, or blob-storage integration. (OUT OF SCOPE)
* Real-money escrow. (OUT OF SCOPE)
* Fiat custody. (OUT OF SCOPE)
* Arbitrary ratings. (OUT OF SCOPE)
* Five-star reviews. (OUT OF SCOPE)
* Free-text reviews. (OUT OF SCOPE)
* Dispute-resolution portal. (OUT OF SCOPE)
* Manual score editing. (OUT OF SCOPE)
* Public transaction-hash profile display. (OUT OF SCOPE)
* Public/private blockchain transaction claims. (OUT OF SCOPE)
* Full Supabase migration. (OUT OF SCOPE)
* Phase 9 or Phase 10 work. (OUT OF SCOPE)

## Deferred Capabilities
* Real evidence-object storage. (DEFERRED)
* Signed evidence manifests. (DEFERRED)
* Evidence provenance authorities. (DEFERRED)
* Public evidence explorer. (DEFERRED)
* Dispute and arbitration workflow. (DEFERRED)
* Broader reputation-policy configuration. (DEFERRED)
* Public transaction visibility controls. (DEFERRED)

## Phase 7 Dependencies
* Phase 7 must remain unmodified.
* Stellar adapter: NO CHANGE
* Soroban contract: NO CHANGE
* Secure-store signer: NO CHANGE
* Transaction submission semantics: NO CHANGE
* Confirmation and reconciliation: NO CHANGE

## Security and Trust Invariants
* The server must calculate or independently verify the SHA-256 hash from the submitted byte payload before persistence or contract submission.
* The client-provided hash must never be trusted as authoritative.
* A mismatch must be rejected before any blockchain submission.
* No raw file content may appear in logs or public evidence.

## Evidence Data Requirements
* Supports at minimum: `id`, `deal_id`, `submitted_by`, `evidence_kind`, `original_filename`, `mime_type`, `byte_size`, `sha256_hash`, `created_at`, `display_visibility`, `chain_operation_reference`. (SUPERVISING TECHNICAL DECISION)
* Does not duplicate existing canonical fields inappropriately. (SUPERVISING TECHNICAL DECISION)

## Reputation Event and Projection Requirements
* Idempotency and exactly-once business effect logic. (SUPERVISING TECHNICAL DECISION)
* One terminal outcome may contribute at most one reputation event per affected participant and rule version. (SUPERVISING TECHNICAL DECISION)

## Idempotency and Recovery Requirements
* Retries, reconciliation, duplicate requests, and repeated reads of the same terminal deal state must not create duplicate reputation events. (SUPERVISING TECHNICAL DECISION)
* Idempotency identity equivalent to: `deal_id + terminal_outcome + participant_id + reputation_rule_version`. (SUPERVISING TECHNICAL DECISION)
* Reputation processing must not be triggered merely because an API endpoint was called; it runs only after authoritative local deal state has persisted a terminal outcome. (SUPERVISING TECHNICAL DECISION)
* If `out_of_sync`, reputation is only processed after authoritative local recovery. (SUPERVISING TECHNICAL DECISION)

## User Experience Requirements
* Application display visibility (not blockchain privacy). (SUPERVISING TECHNICAL DECISION)
* Public profiles display aggregate reputation only and do not display transaction hashes. (SUPERVISING TECHNICAL DECISION)
* Deal Room participants may see authorized deal evidence and operation references. (DOCUMENTED REQUIREMENT)

## Acceptance Matrix
1. Identical byte input produces identical SHA-256 output. (MUST, test: Unit, failure: hash differs)
2. Any byte change produces a different expected fingerprint. (MUST, test: Unit, failure: collision)
3. Server recomputes or independently verifies the hash. (MUST, test: Integration, failure: trusts client hash)
4. Client hash mismatch is rejected before persistence or chain submission. (MUST, test: Integration, failure: persists mismatch)
5. Raw evidence bytes are not logged or published. (MUST, test: Source check, failure: bytes logged)
6. Evidence may only be submitted by an authorized deal actor. (MUST, test: Integration, failure: unauthorized submit)
7. Evidence metadata remains linked to exactly one deal. (MUST, test: Persistence, failure: detached link)
8. Evidence records cannot silently overwrite earlier evidence. (MUST, test: Persistence, failure: overwrite without trace)
9. Reputation cannot be written directly by a client. (MUST, test: API, failure: direct write succeeds)
10. Reputation originates only from authoritative persisted terminal outcomes. (MUST, test: State Machine, failure: triggered by non-terminal)
11. Duplicate terminal processing produces no duplicate reputation event. (MUST, test: Integration, failure: duplicate event)
12. `unknown`, `submitted`, or `out_of_sync` operations do not award reputation. (MUST, test: State Machine, failure: awards reputation early)
13. Reconciliation may produce the missing reputation event once, never more than once. (MUST, test: Integration, failure: multiple events after sync)
14. Aggregate reputation can be rebuilt from reputation events. (MUST, test: Unit, failure: logic divergence)
15. Public profile output exposes aggregate reputation but no transaction hash by default. (MUST, test: UI Behavior, failure: tx hash exposed)
16. Phase 7 Stellar and signer invariants remain unchanged. (MUST, test: Integration, failure: Phase 7 broken)
17. No live Testnet execution is required for normal Phase 8 acceptance. (MUST, test: Operational, failure: requires Testnet)
18. No claim equates evidence hashing with proof of real-world truth. (MUST, test: UX/Copy check, failure: claims truth)

## Validation Strategy
* **Static:** Type checks for new interfaces.
* **Deterministic Local:** Unit tests for persistence uniqueness, hash computation, and idempotency logic. State-machine tests for side-effects.
* **Integration:** Replaying `submit_proof`, `expire`, and `refund` flows to ensure idempotency. Reconciliation failure simulations.

## Implementation Slices
### Slice 1 — Domain Contracts and Persistence Primitives
- **Goal:** Establish Phase 8 data contracts and idempotency foundations without changing application behavior.
- **Included:** evidence metadata types; reputation event types; reputation aggregate types; repository or MockStore primitives; rule-version representation; idempotency identity; deterministic fixtures; unit tests for persistence and uniqueness.
- **Excluded:** API routes; UI; hashing integration; reputation calculation; Stellar changes; contract changes.

### Slice 2 — Deterministic Reputation Domain Service
- **Included:** rule evaluation; event creation; idempotency handling; aggregate projection; aggregate rebuild; terminal-outcome eligibility; `out_of_sync` exclusion; deterministic unit tests.
- Service must not depend directly on Next.js route handlers.

### Slice 3 — Evidence Hashing and Verification Service
- **Included:** byte hashing abstraction; client preview behavior; server-authoritative verification; mismatch rejection; metadata creation; authorization; no-storage disclosure; deterministic tests.
- No UI beyond the minimum test harness is included.

### Slice 4 — Application Integration
- **Included:** connect evidence service to canonical `submit_proof`; connect reputation service after authoritative terminal-state persistence; preserve Phase 7 reconciliation semantics; integration tests for retries and partial failures.

### Slice 5 — Deal Room and Reputation UI
- **Included:** evidence panel; hash and metadata display; storage limitation disclosure; aggregate reputation display; recovery-safe UX; authorized visibility filtering.
- **Excluded:** public transaction-hash profile display; visibility policy expansion; unrelated visual redesign.

## Branch Strategy
1. Preserve `phase-7-rebuild` as the accepted Phase 7 line.
2. Commit this Phase 8 scope gate on `phase-7-rebuild`.
3. Review the scope-gate commit.
4. Push the accepted Phase 7 and scope-gate history only after explicit push authorization.
5. Create `phase-8-proof-reputation` from the reviewed scope-gate checkpoint.
6. Implement Phase 8 only on that dedicated branch.

## Gate Decision
CONDITIONAL GO FOR PHASE 8 AUTHORIZATION

## Authorization Status
Phase 8 implementation:
NOT YET AUTHORIZED
