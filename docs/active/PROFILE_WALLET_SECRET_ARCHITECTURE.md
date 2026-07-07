# Profile Wallet Secret Architecture

**Last Updated:** 2026-07-07
**Context:** Settleway is an escrow platform executing deals via the Stellar network.

This document clarifies the exact boundaries between application-level secrets (environment variables) and user-level secrets (Profile Wallet keys), explicitly defining what is permitted and what is forbidden.

---

## Core Architecture Principles

1. **Env stores app-level secrets only.** Environment variables (`.env`, `.env.local`, Vercel config) are reserved exclusively for infrastructure and application-wide secrets (e.g., `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WALLET_ENCRYPTION_KEY`).
2. **Env must NEVER store per-user private keys.** It is fundamentally incorrect and explicitly forbidden to place user-specific Stellar secret seeds (keys starting with `S`) into environment configuration.
3. **User Profile Wallets are provisioned automatically.** When a user needs a wallet, the Settleway application (server-side) automatically generates a random Stellar keypair. The user does not provide their own private key to Settleway.
4. **Public addresses are public.** The user's Stellar public address (starting with `G`) is safe to store in plaintext in the database and transmit to the frontend.
5. **Private keys are encrypted at rest.** The generated Stellar secret seed is encrypted immediately upon generation using symmetric server-side encryption (AES-256-GCM).
6. **Encrypted secrets are stored in the database.** The resulting `encrypted_secret_key` and its initialization vector are stored in the `user_wallets` table alongside the public address.
7. **Decryption happens server-side only.** The encrypted secret is only decrypted in memory on the server, at the exact moment a transaction must be signed.
8. **Frontend must NEVER receive private keys.** API routes must explicitly map database models to Data Transfer Objects (DTOs) that omit the `encrypted_secret_key`. The frontend only receives the `publicAddress`.
9. **No secret printing.** Logs, tests, documentation, and error messages must never print or expose the plaintext secret seed or the `WALLET_ENCRYPTION_KEY`.

---

## The Role of `WALLET_ENCRYPTION_KEY`

`WALLET_ENCRYPTION_KEY` is an **application-level** symmetric encryption key (a 32-byte hex string).
It is **not** a user's private key.

- It lives in `.env.local` (or production KMS/Vault config).
- Its sole purpose is to encrypt and decrypt the `encrypted_secret_key` field in the database.
- Without it, the server cannot provision new wallets or sign transactions for existing wallets.

> **WARNING:** Do not attempt to solve production signing by putting every user secret in `.env`. That is explicitly forbidden.

---

## Flow Models

### A. Current Testnet Demo Flow

In the local demo/testnet environment, we simulate the presence of Profile Wallets to test the funnel without managing real keys.

1. **Fallback Generation:** When `WALLET_ENCRYPTION_KEY` is missing in `demo` mode, `MockServerWalletRepository` provisions a fallback wallet.
2. **DEMO_PUBLIC_ONLY Sentinel:** The fallback wallet is assigned an `encrypted_secret_key` exactly matching the string `'DEMO_PUBLIC_ONLY'`.
3. **Public Address Exposure:** The frontend receives the public address to enable UI state checks (e.g., "Buyer has a wallet").
4. **Signing Rejection:** When the funding API route calls `ProfileWalletSigner`, the signer sees the `DEMO_PUBLIC_ONLY` sentinel, refuses to load a keypair, and rejects the signing request with `ERR_SIGNER_REJECTED`.
5. **Fail-Closed Execution:** Because signing is rejected, the deal execution coordinator fails safely. No fake transaction hash is generated, and the deal status remains unchanged.

### B. Future Production Managed Wallet Flow (KMS / Vault)

When advancing to production custody:

1. **Key Generation:** Settleway requests key generation from an HSM (Hardware Security Module) or cloud KMS.
2. **Asymmetric Storage:** The private key material never leaves the KMS. The database only stores the KMS key reference or an encrypted ciphertext blob tied to the KMS.
3. **Delegated Signing:** To sign a Stellar transaction, the Settleway server sends the unsigned transaction hash to the KMS. The KMS returns the cryptographic signature.
4. **Zero-Knowledge App:** The Settleway application memory never holds the plaintext private key, completely neutralizing memory dump and remote code execution (RCE) vectors for key theft.

---

## Explicit Directives for Operators

- **If the preflight runbook asks for `WALLET_ENCRYPTION_KEY`:** Generate a random 32-byte hex string and place it in `.env.local`. Do not use a Stellar secret key.
- **If you see `DEMO_PUBLIC_ONLY`:** This means your local environment is running in fail-closed demo mode. This is expected unless you intentionally configure full local signing capabilities.
