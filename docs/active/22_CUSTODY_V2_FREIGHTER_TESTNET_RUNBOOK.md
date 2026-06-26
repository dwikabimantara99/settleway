# 22 - Custody V2 Freighter Testnet Runbook

Status: manual verification guide for `work/custody-v2-app-integration`.

## Preconditions

- Freighter is installed and enabled for `localhost`.
- Freighter is switched to Stellar Testnet.
- Buyer and seller use distinct Testnet public addresses.
- Mediator and treasury are distinct from buyer and seller.
- The app-integration manifest contains a deployed Custody V2.1 contract ID and
  native XLM SAC contract ID.
- `web/.env.local` is configured with Custody V2 public values and
  `CUSTODY_V2_STELLAR_RPC_URL`.
- No secret keys are stored in `.env.local` for buyer or seller.

## Success Corridor

1. Start the web app in demo or persistent mode with Custody V2 enabled.
2. Create or select a deal assigned to `custody_v2_testnet`.
3. Confirm the Deal Room displays Stellar Testnet and XLM as the settlement
   asset.
4. Connect the buyer Freighter account.
5. Buyer runs `Create on Stellar`.
6. Confirm the operation is submitted, then confirmed, before treating it as
   chain state.
7. Switch to seller account.
8. Seller runs `Accept terms on Stellar`.
9. Buyer funds principal plus buyer commitment bond.
10. Seller funds seller performance bond.
11. Confirm projection reaches active/locked only after both funding operations
    are confirmed.
12. Seller records delivery evidence in the app.
13. Seller signs `Submit evidence on Stellar`.
14. Buyer signs `Accept delivery on Stellar`.
15. Record public transaction hashes, ledger references, and final displayed
    outcome.

## Funding-Expiry Corridor

1. Create a second Custody V2 Testnet deal.
2. Buyer creates on Stellar.
3. Seller accepts terms.
4. Buyer funds only.
5. Wait until the funding deadline has passed.
6. Invoke `Finalize funding expiry` with any eligible Testnet wallet.
7. Confirm the operation on Stellar.
8. Verify buyer refund and terminal funding-expired projection.

## Evidence To Capture

- Contract ID.
- Asset contract ID.
- Buyer, seller, mediator, and treasury public addresses.
- Terms hash and contract deal ID.
- Transaction hashes for each action.
- Before/after balances for success and expiry scenarios.
- Browser screenshots showing Testnet labels and confirmed states.

Do not capture or publish seed phrases, secret keys, signed XDR, secure-store
internals, or private browser extension data.
