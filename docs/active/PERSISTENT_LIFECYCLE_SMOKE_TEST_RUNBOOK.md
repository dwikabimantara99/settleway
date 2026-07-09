# PERSISTENT_LIFECYCLE_SMOKE_TEST_RUNBOOK

## Purpose
This runbook provides the official sequence and headless command to safely execute a full testnet persistent lifecycle smoke test (or as far as backend automation supports) against `TESTNET_PERSISTENT_DB` and the Stellar Testnet, without relying on frontend browser automation.

> [!WARNING]
> This runner is currently expected to halt and return `PERSISTENT_SMOKE_RUNNER_PARTIAL` because the full headless execution coordinator hook is not fully supported outside browser-based API auth flows. It will safely test profiles, wallets, and deals, but halts before signing on-chain transactions.

## Prerequisites
- Node.js & npm installed
- Network access to Supabase PostgreSQL target and Stellar Testnet
- Valid `.env.local` containing:
  - `TESTNET_DATABASE_URL` (Used strictly as an environment topology signal, NOT for the Supabase JS client)
  - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` (Used as the Supabase JS REST URL)
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WALLET_ENCRYPTION_KEY`
  - `NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE`

## Security and Secret Handling
- **DO NOT** commit your `.env.local` file.
- **DO NOT** expose `WALLET_ENCRYPTION_KEY`, service role keys, or Stellar secret seeds in logs.
- If a temporary database password is used to generate the connection string, **ROTATE/RESET** the password immediately after the agent/CI executes the run.
- **NO DEPLOY**: This runner must not be executed during production deployments.
- **NO MAINNET**: This runner strictly targets Testnet.

## Dry-Run (Plan Only) Mode
You can dry-run the runner without making any remote connection or data modifications using `SMOKE_PLAN_ONLY=1`:
```bash
cd web
SMOKE_PLAN_ONLY=1 npm run smoke:persistent-testnet
```

## Exact Command
```bash
cd web
npm run smoke:persistent-testnet
```

## Expected Phases
1. **Safety Gates**: Asserts `RUNTIME_MODE=persistent` and requires strict configuration environment presence.
2. **Profile Creation**: Generates two isolated test accounts (`smoke_buyer_<timestamp>` and `smoke_seller_<timestamp>`) and writes them directly to the `profiles` table using the service role to bypass Auth dependency.
3. **Wallet Provisioning**: Invokes `getServerWalletRepository().provisionProfileWallet()` natively server-side to establish backend signing capabilities.
4. **Deal Creation**: Initializes an escrow record strictly bound to the ephemeral profiles.
5. **Execution Coordinator**: Currently halts yielding `PERSISTENT_SMOKE_RUNNER_PARTIAL` as a safe default.
6. **Report Generation**: Emits `docs/active/PERSISTENT_SMOKE_RUN_LATEST.json` capturing execution depth and blockers.

## Stop Conditions
The runner aborts immediately if:
- Database configuration signals are missing.
- Missing encryption keys prevent wallet signing.
- Execution coordinator rejects idempotency or signer validation.

## Classification Meanings
- **PERSISTENT_SMOKE_RUNNER_READY**: The script fully executed the happy-path integration sequence end-to-end (currently not achievable offline).
- **PERSISTENT_SMOKE_RUNNER_PARTIAL**: The script ran successfully until a known automation limitation (e.g., wallet provisioning logic missing or headless execution execution hook blocked) explicitly halted it, reporting the exact blocker securely.
- **PERSISTENT_SMOKE_RUNNER_BLOCKED**: Infrastructure failure (e.g., config missing, DB down).
