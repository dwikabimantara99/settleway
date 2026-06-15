# 20 - Implementation Acceptance Matrix

Use this matrix to decide whether a phase is complete.

| Phase | What must be visible | What must work | What must not happen |
|---|---|---|---|
| 0 | Next.js app shell | `pnpm dev` starts | App created in root instead of `web/` |
| 1 | Landing, nav, components | page loads with Settleway story | crypto-first narrative |
| 2 | Marketplace, buyer requests, profiles | routes render from mock data | Deal Room built before marketplace surface |
| 3 | Full Deal Room UI | money/status/proof panels render | vague escrow UI |
| 4 | API routes and schema | frontend can fetch data | backend blocks without Supabase env |
| 5 | Live state transitions | buyer+seller deposits lock escrow | invalid state transitions allowed |
| 6 | Soroban contract | contract builds/tests | token custody attempted before Tier A |
| 7 | Stellar proof panel | tx/contract metadata stored | fake silent tx success |
| 8 | Proof and reputation | hash and reputation update | five-star review replaces event reputation |
| 9 | Guided demo | full story can be presented | demo depends on manual database editing |

## Phase 7 Acceptance Decision

* **Implementation:** accepted
* **Controlled Testnet functionality:** accepted
* **Evidence provenance:** partially verified
* **Final disposition:** accepted with documented provenance limitations
* **Phase 8 dependency:** requires a separate explicit authorization decision
* Unresolved provenance items remain documented rather than treated as implementation failures.


## Final MVP acceptance

The MVP is ready only if:

1. Marketplace discovery works.
2. Deal Room is clear and central.
3. Full escrow flow can complete.
4. Stellar evidence is visible or honest fallback is shown.
5. Proof hash appears.
6. Reputation updates.
7. Demo script can be followed in 3-5 minutes.
