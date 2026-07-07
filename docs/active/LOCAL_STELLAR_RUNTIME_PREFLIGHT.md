# Local Stellar Testnet Runtime Preflight

**Milestone:** Local Stellar Testnet Runtime Preflight & Deposit Readiness
**Branch:** `feature/local-stellar-runtime-preflight`
**Base commit:** `dd28e6e66699dd5019d7db2cda8aba673a4a2878`
**Classification:** `RUNTIME_CONFIGURATION_INCOMPLETE_WITH_RUNBOOK`
**Date:** 2026-07-07

---

## 1. Purpose

This document is the durable operator checklist for configuring the local Stellar Testnet
runtime so that real (non-fake) Stellar Testnet deposits can be executed through the
Settleway demo funding path.

Nothing in this file contains secrets. Do not add secret values to this file.
Do not commit `.env.local` to the repository.

---

## 2. Preflight Results (Audited 2026-07-07)

### 2.1 stellar-cli

| Check | Result |
|---|---|
| `stellar-cli` binary on PATH | **PRESENT** (`C:\Users\ACER\.cargo\bin\stellar.exe`) |
| Version | **26.1.0** (1228cff8022b804659750b94b315932b0e0f3f6a) |
| `SETTLEWAY_SMOKE_STELLAR_CLI_PATH` configured | **PRESENT** |
| Configured path resolves to valid binary | **VERIFIED** |

### 2.2 Stellar Config Directory

| Check | Result |
|---|---|
| `SETTLEWAY_SMOKE_STELLAR_CONFIG_DIR` configured | **PRESENT** |
| Directory exists | **EXISTS** |
| `identity/` subdirectory | **EXISTS** |
| `network/` subdirectory | **EXISTS** |
| `contract-ids/` subdirectory | **EXISTS** |

### 2.3 Identity Aliases

| Role | Alias | Alias .toml | Result |
|---|---|---|---|
| admin | `settleway-testnet-admin` | Present | **PRESENT** |
| buyer_demo | `settleway-testnet-buyer-demo` | Present | **PRESENT** |
| seller_demo | `settleway-testnet-seller-demo` | Present | **PRESENT** |

All three role aliases are distinct (no overlap).

### 2.4 Network Alias

| Check | Result |
|---|---|
| `SETTLEWAY_SMOKE_STELLAR_NETWORK_ALIAS` configured | **PRESENT** (`settleway-testnet`) |
| Network alias `.toml` exists in config dir | **PRESENT** |

### 2.5 Contract Configuration

| Check | Result |
|---|---|
| `SETTLEWAY_SMOKE_CONTRACT_ID` configured | **PRESENT** |
| Contract ID format | **VALID** (`C[A-Z0-9]{55}` format confirmed) |
| Contract value | `CAGCSRJYCNYKC5BT2C7ZNHXHVMEHNJSJQPWZRFMFFRYCDSKHD6SREJKX` (public, non-secret) |
| Contract IDs in config dir | 3 entries present |

### 2.6 RPC / Network Config

| Check | Result |
|---|---|
| `SETTLEWAY_SMOKE_RPC_URL` configured | **PRESENT** |
| `SETTLEWAY_SMOKE_NETWORK_PASSPHRASE` configured | **PRESENT** |
| `SETTLEWAY_SMOKE_BASE_FEE_STROOPS` | **PRESENT** |
| `SETTLEWAY_SMOKE_MAX_FEE_STROOPS` | **PRESENT** |
| `SETTLEWAY_SMOKE_TIMEOUT_SECONDS` | **PRESENT** |
| Horizon Testnet reachable | **YES** (v27.0.0) |

### 2.7 Testnet Account Balances

| Role | Public Address | Status | Balance |
|---|---|---|---|
| admin | `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG` | EXISTS | ~24,397 XLM (SUFFICIENT) |
| buyer_demo | `GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX` | EXISTS | ~9,996 XLM (SUFFICIENT) |
| seller_demo | `GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU` | EXISTS | ~10,003 XLM (SUFFICIENT) |

All accounts are live on Testnet with well above the minimum 10 XLM threshold.

### 2.8 Missing / Incomplete Configuration

The following variables are **MISSING** from `.env.local` and block the smoke
operator preflight and signer preflight commands from running:

#### Missing: Smoke operator fixture variables (required even for preflight command)

These are required by `loadTestnetSmokeOperatorInput` for ALL commands including `preflight` and `signer_preflight`:

```text
SETTLEWAY_SMOKE_ACKNOWLEDGEMENT       # Required for mutating commands; skip for preflight/signer_preflight but schema still parses
SETTLEWAY_SMOKE_CHECKPOINT_COMMIT     # Git commit SHA to label the smoke run
SETTLEWAY_SMOKE_ADMIN_ADDRESS         # Public address of admin (can derive from stellar-cli)
SETTLEWAY_SMOKE_BUYER_DEMO_ADDRESS    # Public address of buyer_demo
SETTLEWAY_SMOKE_SELLER_DEMO_ADDRESS   # Public address of seller_demo
SETTLEWAY_SMOKE_DEAL_ID               # Fixture deal identifier
SETTLEWAY_SMOKE_BUYER_ID              # Fixture buyer user identifier
SETTLEWAY_SMOKE_SELLER_ID             # Fixture seller user identifier
SETTLEWAY_SMOKE_COMMODITY             # e.g. "Red Chili (Bird's Eye Chili)"
SETTLEWAY_SMOKE_VOLUME_KG             # e.g. 700
SETTLEWAY_SMOKE_DEAL_HASH             # 64-char hex hash of deal terms
SETTLEWAY_SMOKE_PROOF_HASH            # 64-char hex hash of delivery proof
SETTLEWAY_SMOKE_EXPIRES_AT            # Unix timestamp for deal expiry
SETTLEWAY_SMOKE_PRINCIPAL_IDR         # e.g. 19950000
SETTLEWAY_SMOKE_BUYER_BOND_IDR        # e.g. 997500
SETTLEWAY_SMOKE_SELLER_BOND_IDR       # e.g. 997500
SETTLEWAY_SMOKE_BUYER_FEE_IDR         # e.g. 99750
SETTLEWAY_SMOKE_SELLER_FEE_IDR        # e.g. 99750
SETTLEWAY_SMOKE_CONFIRMATION_ATTEMPTS # e.g. 10
SETTLEWAY_SMOKE_NOW_UNIX_SECONDS      # Current unix timestamp
```

#### Missing: Profile Wallet encryption key (required for in-app demo deposit path)

```text
WALLET_ENCRYPTION_KEY     # App-level 32-byte hex key for encrypting Profile Wallet seeds (server-only)
```

> **Note:** `SERVER_WALLET_ENCRYPTION_KEY` is an alternative name. Only one is required.
> This is an **app-level encryption key**. It is **not** a user's private key.
> User private keys must never be placed in `.env`.
> The demo's `DEMO_PUBLIC_ONLY` sentinel bypasses decryption for the Profile Wallet
> public-address-only path, but the full signing path requires this encryption key to locally encrypt/decrypt the generated user seeds.

---

## 3. What Is Ready

The following are **fully ready** for a real Testnet deposit:

- `stellar-cli` binary: installed, correct version
- Stellar config directory: exists with correct subdirectory structure
- Identity aliases: all three roles (`admin`, `buyer_demo`, `seller_demo`) configured
- Network alias: `settleway-testnet` configured
- Contract ID: configured and valid format
- RPC URL and network passphrase: configured
- Fee and timeout parameters: configured
- All three Testnet accounts: exist on Testnet with sufficient XLM (>9,000 XLM each)
- Horizon Testnet RPC: reachable

---

## 4. What Is Blocking the Full Smoke Run

The full smoke operator (`preflight`, `signer_preflight`, `happy_path`) cannot execute because:

1. **Missing fixture variables** — `loadTestnetSmokeOperatorInput` validates ALL fields
   before dispatching to any command, including preflight. The fixture fields
   (`SETTLEWAY_SMOKE_DEAL_ID`, `SETTLEWAY_SMOKE_BUYER_ID`, etc.) must be populated.

2. **Missing public addresses** — `SETTLEWAY_SMOKE_ADMIN_ADDRESS`,
   `SETTLEWAY_SMOKE_BUYER_DEMO_ADDRESS`, `SETTLEWAY_SMOKE_SELLER_DEMO_ADDRESS` must
   be set in `.env.local`. These can be derived from `stellar-cli keys address <alias>`.
   They are **public keys** — safe to set, not secrets.

3. **Missing `WALLET_ENCRYPTION_KEY`** — required for the in-app Profile Wallet signing
   path (`/api/deals/{dealId}/buyer-deposit`). Without this, the demo funding button
   returns `ERR_AUTH_FAILED` or `ERR_SIGNER_UNAVAILABLE`.

---

## 5. How to Complete Configuration

### Step 1 — Add public addresses to `.env.local`

These are public keys — safe to add. They were confirmed above via `stellar-cli keys address`:

```text
SETTLEWAY_SMOKE_ADMIN_ADDRESS=GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG
SETTLEWAY_SMOKE_BUYER_DEMO_ADDRESS=GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX
SETTLEWAY_SMOKE_SELLER_DEMO_ADDRESS=GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU
```

### Step 2 — Add fixture variables to `.env.local`

Use the demo deal values from `docs/active/DEMO_OPERATOR_WALKTHROUGH.md`:

```text
SETTLEWAY_SMOKE_CHECKPOINT_COMMIT=dd28e6e66699dd5019d7db2cda8aba673a4a2878
SETTLEWAY_SMOKE_DEAL_ID=demo-cabai-001
SETTLEWAY_SMOKE_BUYER_ID=buyer-surabaya-restaurant
SETTLEWAY_SMOKE_SELLER_ID=seller-probolinggo-cabai
SETTLEWAY_SMOKE_COMMODITY=Red Chili (Bird's Eye Chili)
SETTLEWAY_SMOKE_VOLUME_KG=700
SETTLEWAY_SMOKE_DEAL_HASH=<64-char hex hash of the agreed deal terms — generate once and record>
SETTLEWAY_SMOKE_PROOF_HASH=<64-char hex hash of the delivery proof document — generate once and record>
SETTLEWAY_SMOKE_EXPIRES_AT=<unix timestamp 72 hours from now>
SETTLEWAY_SMOKE_PRINCIPAL_IDR=19950000
SETTLEWAY_SMOKE_BUYER_BOND_IDR=997500
SETTLEWAY_SMOKE_SELLER_BOND_IDR=997500
SETTLEWAY_SMOKE_BUYER_FEE_IDR=99750
SETTLEWAY_SMOKE_SELLER_FEE_IDR=99750
SETTLEWAY_SMOKE_CONFIRMATION_ATTEMPTS=10
SETTLEWAY_SMOKE_NOW_UNIX_SECONDS=<current unix timestamp when running>
```

To generate hex hashes safely (PowerShell, no secrets):
```powershell
# Example — use a deterministic input string as a stand-in for a real document hash
[System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes("demo-deal-cabai-2026-07-07")) | ForEach-Object { $_.ToString("x2") } | Join-String
```

### Step 3 — Add `WALLET_ENCRYPTION_KEY` to `.env.local`

**Never commit this key.** Generate a secure 32-byte hex key:

```powershell
# Generate a cryptographically secure 32-byte random key as hex (PowerShell)
[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).Replace("-","").ToLower()
```

Add to `.env.local`:
```text
WALLET_ENCRYPTION_KEY=<output from above — never commit>
```

### Step 4 — Verify signer preflight passes

Run:
```powershell
cd web
node --input-type=module --env-file=.env.local -e "
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } });
try {
  const mod = await server.ssrLoadModule('/src/lib/stellar/server/smoke/operator-env.ts');
  const reader = (name) => name === 'SETTLEWAY_SMOKE_COMMAND' ? 'signer_preflight' : process.env[name];
  const loaded = mod.loadTestnetSmokeOperatorInput(reader);
  const result = loaded.ok ? await mod.runTestnetSmokeOperator(loaded.input) : { ok: false, command: null, errors: loaded.errors, summary: null };
  const output = mod.buildOperatorJsonOutput(result);
  process.stdout.write(output.json + '\n');
} finally { await server.close(); }
"
```

Expected: `{"ok":true,"command":"signer_preflight","summary":{"roles":[...],"transport_call_counts":{"rpc_calls":0,"submissions":0,"confirmations":0}}}`

### Step 5 — Start the app and attempt a funding deposit

```powershell
cd web
npm run dev
```

Then in browser:
1. Navigate to `http://localhost:3000/demo` → Reset Demo State
2. Switch role to `buyer-surabaya-restaurant`
3. Navigate to `/deals/demo-cabai-001`
4. Click **Fund from Profile Wallet**
5. Observe response — if `WALLET_ENCRYPTION_KEY` is set and the Profile Wallet has been provisioned, the deposit will attempt a real Testnet transaction

---

## 6. How to Know When Funding Is Actually Confirmed

A real confirmed Testnet deposit has ALL of the following:

1. API route `/api/deals/{dealId}/buyer-deposit` returns HTTP 200
2. Response body contains `ok: true` and a `tx_hash` field
3. `tx_hash` is a 64-character hexadecimal string
4. Deal status transitions to `BUYER_FUNDED` (for buyer) or `LOCKED` (for both funded)
5. The `tx_hash` is visible on the Stellar Testnet Explorer: `https://stellar.expert/explorer/testnet/tx/{tx_hash}`
6. The transaction shows the correct source account (buyer or seller public address)
7. The deal's `latest_stellar_tx_hash` field in the store matches the confirmed hash

Do NOT mark funding confirmed if:
- The response is non-200
- The `tx_hash` is absent or `null`
- The deal status did not change
- The hash does not appear on Stellar Testnet Explorer

---

## 7. What Error Messages Mean

| Error Message | Root Cause | Resolution |
|---|---|---|
| `"Profile Wallet was found, but this demo wallet cannot sign..."` | `DEMO_PUBLIC_ONLY` sentinel active — wallet exists but signing key not configured | Set `WALLET_ENCRYPTION_KEY` and reprovision the Profile Wallet |
| `"The Stellar CLI binary could not be found or is not executable"` | `SETTLEWAY_SMOKE_STELLAR_CLI_PATH` missing or wrong | Verify path to `stellar.exe` |
| `"Stellar config directory does not exist"` | `SETTLEWAY_SMOKE_STELLAR_CONFIG_DIR` missing or wrong path | Verify path to stellar config dir |
| `"Role alias not found in config directory"` | Identity `.toml` missing from config dir | Run `stellar keys generate <alias>` |
| `"The Stellar Testnet funding action could not be confirmed"` | Generic fallback — should no longer appear after dd28e6e | If it does, the route's `existingOperation` intercept failed |
| `ERR_MISSING_CONFIG` / `ERR_INVALID_CONFIG` | Runtime env validation failed in `loadDealRoomTestnetRuntime` | Check all `SETTLEWAY_SMOKE_` env vars |

---

## 8. What Must Never Be Committed

```text
web/.env.local
*.pem
*.key
*_secret_seed*
WALLET_ENCRYPTION_KEY values
SUPABASE_SERVICE_ROLE_KEY values
Stellar secret seeds (S[A-Z0-9]{55})
Any file containing real private key material
```

The `.gitignore` already excludes `.env.local`. Verify with:
```powershell
git ls-files web/.env.local  # Must return empty
```

---

## 9. Friendbot — Funding Testnet Accounts

If any account has insufficient XLM on Testnet:

```powershell
# Replace <address> with the account's public address (safe to use)
Invoke-RestMethod -Uri "https://friendbot.stellar.org?addr=<address>"
```

Current audited balances are well above threshold (>9,000 XLM each). No Friendbot call is
needed at this time.

---

## 10. Runtime Classification

```text
stellar-cli: READY
config directory: READY
identity aliases: READY (all 3 roles)
network alias: READY
contract ID: READY (CAGCSRJYCNYKC5BT2C7ZNHXHVMEHNJSJQPWZRFMFFRYCDSKHD6SREJKX)
RPC/network: READY
Testnet accounts: READY (all 3 funded)
Public addresses in .env.local: MISSING (add per §5 Step 1)
Smoke fixture variables: MISSING (add per §5 Step 2)
WALLET_ENCRYPTION_KEY: MISSING (generate and add per §5 Step 3)

Overall: RUNTIME_CONFIGURATION_INCOMPLETE_WITH_RUNBOOK
```

The infrastructure is ready (CLI, aliases, network, accounts, balances) but the
`.env.local` fixture and encryption key configuration is incomplete. No deposit
attempt was made. No fake funding occurred.

---

## 11. Next Operator Action

Complete Steps 1–4 in §5, then re-run this preflight. Once `signer_preflight` returns
`{"ok":true,...}`, proceed to Step 5 for a bounded real Testnet deposit attempt.

Document the result (HTTP status, tx_hash, deal state before/after) and update this file
with the confirmed `REAL_TESTNET_MANUAL_DEPOSIT_CONFIRMED` or `BLOCKED` classification.

---

_Last updated: 2026-07-07_
_Branch: `feature/local-stellar-runtime-preflight`_
_Classification: `RUNTIME_CONFIGURATION_INCOMPLETE_WITH_RUNBOOK`_
