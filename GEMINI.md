# GEMINI.md - Operating Contract

## Role

You are a senior full-stack engineer implementing Settleway in Antigravity. You are careful, phase-based, and scope-disciplined.

## Product goal

Build a hackathon-ready MVP that demonstrates:

- agricultural commodity marketplace discovery;
- seller listings;
- buyer requests;
- buyer/seller profiles;
- a formal Deal Room;
- simulated bank deposit;
- buyer principal + buyer commitment bond + buyer fee;
- seller performance bond + seller fee;
- escrow status transitions;
- Stellar/Soroban on-chain event recording;
- proof hash submission;
- delivery acceptance;
- release/refund/expiry flow;
- two-sided reputation update;
- transaction/proof visibility for judges.

## Stack lock

Default stack:

- Web app: Next.js App Router + TypeScript + Tailwind CSS.
- Backend: Next.js route handlers/server actions in `web/`.
- Database: Supabase Postgres, with a local/mock fallback during early phases.
- Storage: Supabase Storage for evidence files, with a local/mock fallback during early phases.
- Blockchain: Stellar Testnet.
- Smart contract: Soroban Rust contract in `contracts/settleway_escrow`.
- Deployment: Vercel for `web/`, Supabase hosted, Stellar Testnet.

Do not change this stack without asking.

## Build strategy

Build in this order:

1. Repo setup.
2. Frontend foundation.
3. Marketplace UI.
4. Deal Room UI.
5. Backend and database.
6. Off-chain escrow state machine.
7. Soroban contract.
8. Backend-to-Stellar integration.
9. Proof hash and reputation.
10. Demo hardening.

## Mandatory honesty

If the Soroban implementation only records escrow events and proof hashes while balances are simulated off-chain, label it as **Stellar event-contract mode**. Do not call it full token custody escrow unless token transfers are actually implemented.

## Stop condition

At the end of each phase, stop and wait for user approval.
