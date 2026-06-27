# Recovery Milestone 1 Browser Acceptance

## Local Startup

Use PowerShell from `D:\Settleway\web`:

```powershell
$env:RUNTIME_MODE="demo"
$env:NEXT_PUBLIC_RUNTIME_MODE="demo"
$env:NEXT_PUBLIC_CUSTODY_V2_ENABLED="true"
$env:NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
$env:NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID="CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4"
$env:NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
$env:NEXT_PUBLIC_CUSTODY_V2_MEDIATOR_ADDRESS="GARSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSGIZDEMRSG6NV"
$env:NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION="2"
$env:NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION="2"
$env:CUSTODY_V2_STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Browser Evidence Captured

Evidence directory:

`docs/active/recovery-corridor-1-screenshots/`

Captured files:

1. `01-accepted-negotiation.png`
2. `02-mutual-open-deal-readiness.png`
3. `03-wallet-binding-state.png`
4. `04-buyer-v2-deal-room-before-creation.png`
5. `05-seller-waiting-before-creation.png`
6. `11-deals-index-with-v2-deal.png`
7. `mobile-02-buyer-create-state.png`
8. `mobile-03-seller-waiting-state.png`

The screenshots are from a normal offer/open-room corridor-created deal:

```text
http://127.0.0.1:3000/deals/deal-offer-1782533103756
```

The offer screenshots are captured after the corridor has already completed mutual Open Deal Room, so they preserve the accepted negotiation and wallet-bound source context rather than a pre-click frozen intermediate.

## Verified Browser Facts

- The authenticated app navbar points Deals to `/deals`, not `/deals/demo-cabai-001`.
- `/deals` lists the newly created `custody_v2_testnet` deal.
- Buyer session shows buyer wallet role and the valid `Create on Stellar` CTA.
- Seller session shows seller wallet role and a waiting explanation before buyer creation.
- Seller session does not expose a dead `Create on Stellar` action button.
- Deal Room shows `Custody V2 · Stellar Testnet`.
- Deal Room labels the settlement asset as XLM and displays the native XLM SAC.
- Deal Room displays the dedicated application integration contract ID.
- Deal Room displays immutable buyer and seller wallet addresses.
- Deal Room displays principal, buyer commitment bond, seller performance bond, terms hash, and contract deal ID.
- Commercial IDR reference is visually separated from the Testnet XLM obligations.

## Console And Network Evidence

- Browser-facing route `/deals/deal-offer-1782533103756` returned HTTP 200.
- API route `/api/deals/deal-offer-1782533103756` returned HTTP 200.
- Local browser console check returned no error or warning entries during initial in-app browser inspection.

## Freighter Acceptance Status

Real Freighter signing was not completed in this automated run because extension popup approval requires the founder's two Edge profiles and manual wallet approval.

The next manual acceptance step is:

1. Open `http://127.0.0.1:3000/deals/deal-offer-1782533103756` in Edge Profile 1 with the buyer Freighter wallet active on Testnet.
2. Click `Create on Stellar`.
3. Approve the Freighter signature.
4. Wait for confirmation and refresh if needed.
5. Open the same URL in Edge Profile 2 with the seller Freighter wallet active on Testnet.
6. Click `Accept terms on Stellar`.
7. Approve the Freighter signature.
8. Confirm the final state is `Awaiting funding`.

No funding, evidence, settlement, breach, dispute, cancellation, or reputation actions should be performed during Milestone 1 acceptance.
