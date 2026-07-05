# Settleway Account-First Wallet Architecture

## Core Philosophy

Settleway aims to be an accessible B2B platform. The primary user journey **must not** require external wallet extensions (like Freighter or MetaMask) for login, session management, or initial onboarding.

Users register using standard web patterns (e.g., Email login). Upon registration, Settleway provisions a **Settleway Profile Wallet**. This serves as the user's primary identity and balance source within the platform.

## Wallet Definitions & Roles

It is critical to distinguish between the different wallets/accounts operating in the Settleway ecosystem:

### 1. Settleway Profile Wallet
- **Owner**: The individual registered user.
- **Purpose**: The user's internal Stellar address. Acts as the source of funds for Deal Room deposits and the destination for returning bonds/principal upon settlement.
- **Location of Funds**: User holds custody/balance here *before* deals are locked and *after* deals conclude.
- **Custody Risk / Unresolved Decision**: Since the user does not bring their own wallet, Settleway must securely manage the private keys for these profile wallets (e.g., via KMS, secure enclaves, or passkeys). This introduces managed-custody compliance and security risks that must be resolved before mainnet production deployment.

### 2. Soroban Escrow Contract (The Lockbox)
- **Owner**: The deployed Soroban smart contract.
- **Purpose**: Holds active deal funds securely. 
- **Location of Funds**: Active deal funds (Buyer Principal, Buyer Bond, Seller Bond) are **locked here** during the `LOCKED`, `PROOF_SUBMITTED`, and `DELIVERED` phases. Funds are absolutely **not** held in the user profile wallet or the Settleway fee wallet during an active deal.

### 3. Settleway Fee Wallet (Treasury)
- **Owner**: Settleway Platform.
- **Purpose**: Receives the platform fee (e.g., 0.5% of buyer principal) strictly *after* successful settlement. It may also receive a portion of penalized bonds in the event of a breach.

### 4. External Wallet
- **Owner**: The user (via Freighter, hardware wallet, exchange, etc.).
- **Purpose**: A funding source. Users can transfer assets from their external wallet to their Settleway Profile Wallet address.
- **Requirement**: **Optional**. External wallets are a mechanism to top up the Profile Wallet, not a requirement to use the app.

## Deposit Model

### Path A: External Wallet Transfer (Current Implementation Target)
1. User logs into Settleway via email.
2. User navigates to their Profile to see their **Settleway Profile Wallet** deposit address.
3. User opens their external wallet/exchange and sends Stellar assets to that address.
4. Settleway detects the incoming transfer and updates the user's available balance.

### Path B: Fiat / Local Provider / Anchor (Future Architecture)
*(Note: This is future product vision, not currently implemented in production).*
1. User chooses to fund via local bank transfer, QRIS, or a fintech partner.
2. The partner/Anchor processes the fiat payment.
3. The partner mints/credits the equivalent Stellar asset directly to the user's Settleway Profile Wallet.
4. The user's balance is instantly usable for Deal Room deposits.
