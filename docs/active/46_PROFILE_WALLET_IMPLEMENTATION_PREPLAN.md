# Implementation Pre-Plan: Profile Wallet Auto-Provisioning

## Goal
Implement the first milestone of the Account-First architecture: automatically generating and assigning a Stellar Profile Wallet to a user upon registration, securely storing the key for testnet demo purposes, and displaying the public address in the UI.

## 1. Database Schema Additions
We need a secure place to store the generated Stellar keys.

**Table**: `user_wallets`
- `user_id` (uuid, primary key, references auth.users)
- `public_address` (text, non-null)
- `encrypted_secret_key` (text, non-null)
- `created_at` (timestamptz)

**Security**:
- RLS Policy: Users can `SELECT` their own row. 
- *Crucially*, the `encrypted_secret_key` column should be excluded from standard queries or handled strictly server-side (e.g., via a secure view or Supabase Vault integration) so the client SDK cannot retrieve it.

## 2. Wallet Generation Logic
- **Trigger**: When a new user signs up.
- **Mechanism**: Use a Supabase Edge Function or Database Trigger (`after insert on auth.users`) that:
  1. Calls Stellar SDK `Keypair.random()`.
  2. Extracts `publicKey()` and `secret()`.
  3. Encrypts the `secret()` using a server-side symmetric key (e.g., via `pgcrypto` or Supabase Vault).
  4. Inserts the record into `user_wallets`.

## 3. Profile UI Updates
- **File**: `src/app/profiles/[userId]/page.tsx` (and related components).
- **Changes**:
  - Remove the "Connect Wallet" button (Freighter prompt) from the primary flow.
  - Fetch the user's `public_address` from `user_wallets`.
  - Display the `public_address` with a "Copy Deposit Address" button.
  - Implement a polling mechanism or server action to check the Horizon API for the `public_address` balance and display it.

## 4. API / Backend Updates
- The backend needs utility functions to decrypt the `encrypted_secret_key` in memory. This utility must be strictly isolated to server environments (`server-only` module in Next.js).
- When a deposit action is triggered in the Deal Room, the backend route (`/api/deals/[dealId]/deposit`) will use this utility to sign the Soroban contract invocation on behalf of the user.

## 5. Migration Strategy for Existing Mock Data
- The current `demo-data.ts` and `demo-wallets.ts` hardcode certain addresses (e.g., Buyer 1, Seller 1).
- We must ensure that logging in as a demo user maps to an actual funded testnet keypair, or we must dynamically provision and fund testnet keypairs for demo users using the Friendbot faucet during the demo reset script.

## 6. What Must Not Be Touched
- Do not modify the Soroban smart contracts.
- Do not alter the core escrow state machine (`state-machine.ts`).

## 7. Exit Criteria
- A new user can register via email.
- The user is immediately assigned a `G...` Stellar address.
- The UI displays this address.
- The private key `S...` is never transmitted in any HTTP response to the browser.
