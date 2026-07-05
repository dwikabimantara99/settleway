# Architecture Decision Record: Managed Wallet Custody

## 1. Context

Settleway is pivoting to an account-first model where users do not need to bring their own Stellar wallet (e.g., Freighter) to use the platform. Instead, Settleway provisions a **Settleway Profile Wallet** for them upon registration. 
Because the user does not hold the keys on their own device, Settleway must act as a managed custodian for these profile wallets. This introduces profound security, compliance, and architectural responsibilities. We must design a safe architecture for demo/testnet now, while acknowledging the strict boundaries required for future production mainnet.

## 2. Architecture Roles

| Role | Definition / Control | Demo Status | Future Production Status |
|---|---|---|---|
| **User Account** | The Supabase Auth identity (Email/Password). | Active | Active |
| **Settleway Profile Wallet** | The Stellar keypair mapped to the user. Acts as their balance. | Managed by Settleway backend. | Must be managed via KMS/Secure Enclaves or Passkeys. |
| **Wallet Secret / Signing Authority** | The raw `S...` private key. | Stored encrypted in Supabase Vault (Testnet only). | Never touches Supabase. Held in HSM/KMS. |
| **Backend Signing Service** | Service-role API routes that sign on-chain transactions on behalf of users. | Signs Deal Room deposits after UI confirmation. | Same, but with strict rate-limiting and audit logging. |
| **Soroban Escrow Contract** | The lockbox where active deal funds reside. | Active | Active (Requires audit). |
| **Settleway Fee Wallet** | Treasury wallet receiving the 0.5% platform fee. | Active | Active. |
| **External Funding Wallet** | User's own Freighter/exchange wallet used to send funds in. | Optional funding path. | Optional funding path. |
| **Anchor / Financial Provider** | Fiat on/off ramps (e.g., local banks, QRIS). | Future / Deferred. | Primary B2B funding path. |

## 3. Demo/Testnet Architecture Decisions

### 3.1 Wallet Creation Timing
- **Decision**: Generate the Stellar keypair automatically upon initial user signup (via a Supabase Auth Trigger or first-login hook).
- **Reasoning**: Ensures the Profile Wallet address is immediately available to display on the Profile page so users can fund it.

### 3.2 Key Storage Model (Testnet Only)
- **Decision**: The secret key will be generated server-side and stored in a secure, encrypted format (e.g., Supabase Vault or encrypted columns using `pgsodium`).
- **WARNING: Account Control**: Anyone with the unencrypted Stellar secret key has full, irreversible control over the account and its funds. Storing encrypted keys in a generic database is **NOT** a production-ready custody architecture. It is strictly a demo/testnet workaround to unblock product UI testing.
- **Strict Boundary**: The private key **MUST NEVER** be serialized to the frontend client. The client only receives the public `G...` address.

### 3.3 Backend Signing Model
- **Decision**: The backend `Service Role` will retrieve the user's encrypted secret key in memory, sign the requested `FUND_BUYER` or `FUND_SELLER` operation, and submit it to the network.
- **Guardrail**: The backend will only sign operations if the user holds an active, authenticated session and explicitly clicks "Deposit" in the UI. Silent background withdrawals are forbidden.

### 3.4 Profile Wallet Funding
- **Decision**: The user uses an external wallet (or the testnet-only Friendbot faucet) to send XLM/USDC to their Profile Wallet `G...` address.
- **Detection**: The UI will poll or listen to Stellar Horizon for incoming payments to update the "Available Balance" automatically.

### 3.5 Deal Room Deposit
- **Decision**: When the user clicks "Deposit" in the Deal Room:
  1. Frontend calls `/api/deals/[dealId]/deposit`.
  2. Backend verifies Auth session and Deal State (`WAITING_DEPOSITS`).
  3. Backend fetches user's encrypted secret key.
  4. Backend builds a transaction transferring funds from Profile Wallet to Escrow Contract.
  5. Backend signs and submits to Stellar RPC.
  6. Backend updates database state to `BUYER_FUNDED` or `LOCKED`.

### 3.6 Withdrawal / Export Policy
- **Decision**: For the demo/testnet phase, we will explicitly **defer** secret key export and withdrawal UI. 
- **Reasoning**: Exporting private keys encourages users to think of this as a generic crypto wallet, which contradicts the product vision of a managed trust platform. If they want funds out in a demo, they can use an external wallet.

## 4. Operation Security Matrix

| Operation | User Action Required? | Backend Signs? | On-chain? | Notes |
|---|---|---|---|---|
| **Create Wallet** | Yes (Signup) | No (Key Gen) | No | Secret stored encrypted. |
| **Fund Profile Wallet** | Yes (External transfer) | No | Yes | User initiates from outside. |
| **Fund Deal Room** | Yes (Click Deposit) | Yes | Yes | Backend signs transfer to Escrow. |
| **Submit Evidence** | Yes (Upload) | Service Role | Yes | Backend signs the hash anchoring. |
| **Accept Delivery** | Yes (Click Accept) | Service Role | Yes | Backend signs settlement trigger. |

## 5. Security Risks and Required Guardrails

1. **Leaked Key / Backend Compromise**: If the backend is compromised, all user profile wallets are exposed. 
   - *Guardrail*: This is acceptable strictly for **Testnet/Demo tokens**. Production will require AWS KMS or Lit Protocol to ensure the backend never sees raw private keys.
2. **Unauthorized Silent Transactions**: A rogue script calls the backend deposit route without user intent.
   - *Guardrail*: CSRF protection, strict session validation, and eventually multi-factor confirmation for large deposits.
3. **No Private Key in Client Bundle**: 
   - *Guardrail*: Code review must explicitly block `secret` from any API JSON response.
4. **No Private Key in Logs**:
   - *Guardrail*: The secret key must never be printed to stdout, logger utilities, or stored in plaintext environment variables.

## 6. Current Code Compatibility Notes

- The current `legacy_demo` and `managed_custody` concepts in `state-machine.ts` and `rail-guards.ts` conflict with this clean separation. We must deprecate `managed_custody` (which currently fakes operations without real on-chain asset movement) in favor of using real testnet assets moving from the new Profile Wallets into the `custody_v2` smart contract.
- Existing demo role switchers should be preserved but moved strictly to a debug layer so they don't break the illusion of the account-first flow for standard users.
