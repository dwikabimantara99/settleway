# Settleway Agent Project Root

This folder is the source-of-truth package for building **Settleway** in Antigravity with Gemini.

**Settleway** is a high-value agricultural commodity marketplace MVP with marketplace discovery, buyer requests, a formal Deal Room, simulated bank deposit, dual commitment bonds, Stellar/Soroban escrow events, proof hashes, settlement, and two-sided reputation.

Tagline: **The Safer Way to Settle Real-World Trade**

## Important directory rule

Only this folder, `1_GEMINI_PROJECT_ROOT`, should be copied into the empty `settleway` project folder opened in Antigravity.

The human guide folder must stay outside the project root. Gemini should not use the human guide as source-of-truth unless the user pastes a specific prompt from it.

## Build order

1. Read `AGENTS.md` and `GEMINI.md`.
2. Read the docs in `docs/`.
3. Start with `prompts/00_AUDIT_MODE.md`.
4. Do not code until the user approves the audit response.
5. Build phase by phase from `prompts/01_PHASE_0_REPO_SETUP.md` to `prompts/10_PHASE_9_DEMO_HARDENING.md`.

## Target repository layout after implementation

```text
settleway/
  AGENTS.md
  GEMINI.md
  README.md
  docs/
  prompts/
  diagrams/
  web/                         # Next.js app, created in Phase 0
  contracts/settleway_escrow/   # Soroban Rust contract, created in Phase 6
  scripts/                      # setup/seed helper scripts, created as needed
```

## Non-negotiable principle

The app must prove the end-to-end hackathon story first. Do not build broad production features before the core demo works.
