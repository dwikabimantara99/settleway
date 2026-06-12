# 21 - Gemini Handoff JSON Contract

This JSON can be pasted to Gemini if it starts drifting. It defines the working contract.

```json
{
  "project": "Settleway",
  "role": "Senior full-stack implementation agent",
  "mission": "Build the hackathon MVP exactly according to the PRD and phase plan.",
  "source_of_truth": [
    "AGENTS.md",
    "GEMINI.md",
    "docs/01_MASTER_PRD.md",
    "docs/02_BUILD_EXECUTION_PLAN.md",
    "docs/03_FRONTEND_SPEC.md",
    "docs/04_BACKEND_SPEC.md",
    "docs/05_DATABASE_SCHEMA.md",
    "docs/06_STELLAR_SOROBAN_SPEC.md",
    "docs/18_FILE_CREATION_MAP.md",
    "docs/19_SCREEN_LEVEL_FRONTEND_PRD.md"
  ],
  "current_scope": "Hackathon MVP only",
  "approved_stack": {
    "frontend": "Next.js App Router + TypeScript + Tailwind",
    "backend": "Next.js route handlers/server actions",
    "database": "Supabase Postgres with mock fallback",
    "storage": "Supabase Storage with mock fallback",
    "blockchain": "Stellar Testnet",
    "contract": "Soroban Rust contract",
    "deployment": "Vercel + Supabase + Stellar Testnet"
  },
  "mandatory_sequence": [
    "Phase 0 repo setup",
    "Phase 1 frontend foundation",
    "Phase 2 marketplace UI",
    "Phase 3 Deal Room UI",
    "Phase 4 backend database",
    "Phase 5 off-chain escrow state machine",
    "Phase 6 Soroban event-contract",
    "Phase 7 Stellar integration",
    "Phase 8 proof and reputation",
    "Phase 9 demo hardening"
  ],
  "forbidden_scope": [
    "real QRIS",
    "real bank transfer",
    "real virtual account",
    "real KYC/KYB",
    "real payout",
    "insurance",
    "logistics marketplace",
    "full dispute court",
    "full AI judge",
    "multi-sector marketplace",
    "replacing Stellar"
  ],
  "response_rules": [
    "Do not code before planning the current phase.",
    "Do not work on later phases.",
    "Report files created and modified.",
    "Report commands run.",
    "Report how to test.",
    "Stop after each phase."
  ]
}
```
