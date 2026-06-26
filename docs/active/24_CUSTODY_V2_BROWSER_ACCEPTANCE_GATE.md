# 24 - Custody V2 Browser Acceptance Gate

Status: founder/manual browser gate prepared for `work/custody-v2-app-integration`.

## Purpose

This gate verifies the real browser wallet experience that automated secure-store proof cannot cover. It must be completed with Freighter on Stellar Testnet before the Custody V2 application branch is considered ready for promotion review.

## Preconditions

- Branch: `work/custody-v2-app-integration`
- Runtime mode: demo or persistent local environment with Custody V2 enabled.
- Contract ID: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`
- Settlement asset: native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Freighter installed and set to Stellar Testnet.
- Buyer and seller use distinct Testnet accounts.
- No seed phrase, secret key, signed XDR, or extension private data is captured.

## Required Browser Success Corridor

1. Connect buyer wallet.
2. Freeze or select a Custody V2 Testnet deal.
3. Buyer signs `CREATE_DEAL`.
4. Confirm the app shows the transaction as submitted, then confirmed.
5. Switch to seller wallet.
6. Seller signs `ACCEPT_TERMS`.
7. Buyer signs `FUND_BUYER`.
8. Seller signs `FUND_SELLER`.
9. Confirm the Deal Room reaches active/locked only after both funding operations are confirmed.
10. Seller records delivery evidence and signs `SUBMIT_EVIDENCE`.
11. Buyer signs `ACCEPT_DELIVERY`.
12. Confirm the final app state is `SettledSuccess`.

## Required Funding-Expiry Corridor

1. Create or select a second Custody V2 Testnet deal.
2. Buyer signs `CREATE_DEAL`.
3. Seller signs `ACCEPT_TERMS`.
4. Buyer signs `FUND_BUYER`.
5. Seller does not fund.
6. Wait until the funding deadline passes.
7. Invoke `EXPIRE_FUNDING` with an eligible Testnet wallet.
8. Confirm the final app state is `FundingExpired`.

## Evidence To Record

- Browser route and local runtime mode.
- Buyer and seller public addresses.
- Contract deal ID and terms hash for each scenario.
- Public transaction hash for each signed action.
- Final direct app state for each scenario.
- Screenshot of the success terminal state.
- Screenshot of the funding-expiry terminal state.
- Confirmation that Freighter was on Testnet.
- Confirmation that no secrets, signed XDR, or extension internals were recorded.

## Acceptance Result

Pending founder execution.
