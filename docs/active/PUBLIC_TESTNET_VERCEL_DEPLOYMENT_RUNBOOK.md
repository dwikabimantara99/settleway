# Public Testnet Vercel Deployment Runbook

## Purpose
This document provides instructions for deploying Settleway to Vercel as a **Public Testnet Hackathon Preview**.

## Definition
This deployment is NOT production and NOT mainnet. It allows public users (e.g. hackathon judges) to create accounts, list supply, submit offers, and execute the actual escrow lifecycle on the Stellar Testnet. The `demo` mock mode remains available as a fallback.

## Vercel Project Settings
In the Vercel dashboard:
- **Framework Preset**: Next.js
- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Install Command**: `npm install` (default)
- **Output Directory**: `.next` (default Next.js)

## Required Environment Variables
Add these to the Vercel project environment settings (Preview and Production):

### Public (Client-Safe)
- `NEXT_PUBLIC_RUNTIME_MODE` (Set to `persistent`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STELLAR_NETWORK` (e.g., `TESTNET`)
- `NEXT_PUBLIC_STELLAR_RPC_URL`

### Server-Only (Keep Secret)
- `SUPABASE_SERVICE_ROLE_KEY`
- `WALLET_ENCRYPTION_KEY`
- `SERVER_WALLET_ENCRYPTION_KEY` (if separate)
- `STELLAR_NETWORK_PASSPHRASE`
- `TESTNET_RPC_URL`

*(Do NOT commit actual values. Do NOT print them in client components.)*

## Vercel Dashboard Steps
1. Open Vercel dashboard.
2. Click **Add New...** -> **Project**.
3. Import the `settleway` GitHub repository.
4. Set **Root Directory** to `web`.
5. Ensure Framework Preset is **Next.js**.
6. Expand **Environment Variables** and add the keys listed above.
7. Click **Deploy**.
8. Once complete, copy the public URL provided by Vercel.

## Normal Public Account QA Checklist
Once deployed, perform the following on the live Vercel URL:
1. [ ] Open public Vercel URL.
2. [ ] Create a buyer account.
3. [ ] Create a seller account (use a second browser or incognito mode).
4. [ ] Seller creates or views a supply listing.
5. [ ] Buyer submits an offer on that listing.
6. [ ] Enter the negotiation room.
7. [ ] Agree on terms and click **Open Deal Room** (mutual commitment).
8. [ ] Confirm profile wallet creation upon entering the active Deal Room.
9. [ ] Confirm Testnet funding/deposit paths are visible and functional.
10. [ ] Submit delivery proof as the seller.
11. [ ] Accept delivery and trigger settlement as the buyer.
12. [ ] Confirm Deal Room updates to Settled with proper evidence and transaction hashes.
13. [ ] Check the seller's profile/reputation page to verify eligibility metrics updated.

## Demo Fallback QA Checklist
1. [ ] Navigate to `<vercel-url>/?demo=1`.
2. [ ] Use the Demo Role Switcher to toggle between Buyer and Seller.
3. [ ] Go to `/marketplace/listing-cabai-001?demo=1`.
4. [ ] Click **Submit Offer** and confirm it routes to the seeded demo negotiation room.
5. [ ] Click **Open Deal Room** and confirm it enters the seeded active deal room.

## What Must Not Be Claimed
- Do **not** claim this is running on Stellar Mainnet.
- Do **not** claim production-grade non-custodial wallets.
- Do **not** claim real fiat bank integration or QRIS (it is simulated/testnet).
- Do **not** claim AI decision-making or real legal enforceability.

## Troubleshooting
- **Build fails on Vercel:** Check that `NEXT_PUBLIC_RUNTIME_MODE="persistent"` is set, and Supabase variables are correctly formatted without trailing spaces.
- **500 Server Errors on Deal Room:** Verify `WALLET_ENCRYPTION_KEY` is exactly 32 bytes (usually hex or base64) and matches the local environment.
- **Stellar transactions failing:** Ensure `TESTNET_RPC_URL` is responsive and the provisioned testnet wallets have not been purged by Friendbot limits.
