# PERSISTENT_LIFECYCLE_SMOKE_TEST_RUNBOOK

## Purpose
This runbook provides the official sequence and headless command to safely execute a testnet persistent lifecycle smoke test against `TESTNET_PERSISTENT_DB` and the Stellar Testnet, without relying on frontend browser automation.

> [!WARNING]
> Full persistent lifecycle is only proven if buyer fund, seller fund, proof, delivery, and settlement all verify.
> Currently, this runner only safely orchestrates staging, buyer funding, and seller funding (up to status LOCKED). It yields `PERSISTENT_SMOKE_RUNNER_READY_FOR_DELIVERY_EXTENSION` if funding confirms on-chain.

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
- If a temporary database password is used to generate the connection string, **ROTATE/RESET** the password immediately after the operator executes the run.
- **NO DEPLOY**: This runner must not be executed during production deployments.
- **NO MAINNET**: This runner strictly targets Testnet.

## Dry-Run (Plan Only) Mode
You can dry-run the runner without making any remote connection or data modifications using `SMOKE_PLAN_ONLY=1`:
```bash
cd web
SMOKE_PLAN_ONLY=1 ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1 npm run smoke:persistent-testnet
```

## Operator-Only Headless Execution
To allow the script to execute actual Testnet funding operations bypassing browser auth, you must provide the explicit environment gate. This is heavily restricted to Testnet-mode and offline operator execution only.

```bash
cd web
ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1 npm run smoke:persistent-testnet
```

## Expected Phases
1. **Safety Gates**: Asserts `RUNTIME_MODE=persistent` and requires strict configuration environment presence.
2. **Profile Creation**: Generates isolated test accounts (`smoke_buyer_<timestamp>` and `smoke_seller_<timestamp>`) and writes them directly to the `profiles` table.
3. **Wallet Provisioning**: Invokes `getServerWalletRepository().provisionProfileWallet()` natively server-side to establish backend signing capabilities.
4. **Deal Creation**: Initializes an escrow record strictly bound to the ephemeral profiles.
5. **Headless Execution Coordinator**: If authorized by `ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1`, coordinates and pushes Stellar Testnet funding sequences.
6. **Report Generation**: Emits `docs/active/PERSISTENT_SMOKE_RUN_LATEST.json` capturing execution depth and blockers.

## Expected Classifications
- **PERSISTENT_SMOKE_RUNNER_READY**: Not currently reachable. Requires full delivery/settlement hooks.
- **PERSISTENT_SMOKE_RUNNER_READY_FOR_DELIVERY_EXTENSION**: The script successfully validated staging and on-chain funding, halting safely before proof/delivery.
- **PERSISTENT_SMOKE_RUNNER_PARTIAL**: The script ran successfully until a known automation limitation (e.g., wallet provisioning logic missing or headless hook denied) halted it.
- **PERSISTENT_SMOKE_RUNNER_BLOCKED**: Infrastructure failure (e.g., config missing, DB down).
