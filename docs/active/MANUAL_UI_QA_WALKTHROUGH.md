# Manual UI QA Walkthrough

This document provides a guided walkthrough for the human founder to safely experience and verify the Settleway UI Custody Lifecycle demo locally before final submission.

## A. How to start the app

To safely run the application locally in the exact demo mode without risking real Stellar Mainnet or real database corruption, run the following commands in PowerShell from the repository root:

```powershell
cd web
$env:NEXT_PUBLIC_RUNTIME_MODE="demo"
npm run dev
```

The application will start on `http://localhost:3000`. Leave the terminal open while you test.

## B. URLs to open

Use the following exact URLs to navigate the demo safely. The `?demo=1` parameter unlocks the role switcher and bypasses standard auth guards.

- **Demo Dashboard:** `http://localhost:3000/demo`
- **Landing Route:** `http://localhost:3000/?demo=1`
- **Marketplace Route:** `http://localhost:3000/marketplace?demo=1`
- **Chili Listing Detail:** `http://localhost:3000/marketplace/listing-cabai-001?demo=1`
- **Negotiation Thread:** `http://localhost:3000/offers/offer-demo-cabai-001?demo=1`
- **Active Deal Room:** `http://localhost:3000/deals/demo-cabai-001?demo=1`
- **Seller Profile (Reputation):** `http://localhost:3000/profiles/seller-probolinggo-cabai?demo=1`

## C. Manual test script

Please step through the application and explicitly verify the following 20 points:

1. [ ] Landing page opens.
2. [ ] Marketplace cards are visible.
3. [ ] Submit Offer / View Details flow is understandable.
4. [ ] Deal Room opens successfully.
5. [ ] Demo mode role switcher appears only with `?demo=1`. (Check by removing the param in incognito mode).
6. [ ] Buyer view is understandable and accurate for the role.
7. [ ] Seller view is understandable and accurate for the role.
8. [ ] Deal Timeline accurately shows the lifecycle steps in the correct order.
9. [ ] Stellar Evidence Panel successfully appears in the Deal Room.
10. [ ] Proof Hash appears natively under timeline items only when available.
11. [ ] Delivery Proof UI correctly appears for the seller during the `LOCKED` phase.
12. [ ] Buyer sees a non-actionable "Awaiting Delivery Proof" review state while the seller is uploading.
13. [ ] Completed state is understandable and clearly signifies the finality.
14. [ ] Reputation UI is visible on the Seller Profile page.
15. [ ] Crowdfunding eligibility preview is visible and displays false ("Not eligible yet") below the threshold (10 txs / $20,000 equiv).
16. [ ] No obvious broken layout or overflowing elements on desktop widths.
17. [ ] No obvious broken layout on mobile width (using browser DevTools device toggle).
18. [ ] No scary developer-only debug text or JSON is visible in normal mode.
19. [ ] No fake mainnet/production crypto-custody claim is visible (all references should align with Testnet).
20. [ ] No broken buttons or dead links in the primary judge path.

## D. What to screenshot

Please capture and share screenshots of the following views:

1. Landing / marketplace page.
2. Deal Room timeline highlighting the steps.
3. Stellar Evidence Panel showing testnet hashes and links.
4. Delivery Proof panel (from seller's perspective).
5. Settlement Completed card (when deal reaches completed status).
6. Reputation / Eligibility profile (Seller profile).

## E. Issue logging format

If you encounter any bugs, weird layouts, or missing features, please use the following template to log them:

- **Screen:** (e.g., Deal Room, Marketplace)
- **What I clicked:** (e.g., "Submit Offer" button)
- **Expected:** (e.g., Modal should pop up)
- **Actual:** (e.g., Nothing happened)
- **Severity:** (Blocker / High / Low / Cosmetic)
- **Screenshot:** (Attach if possible)

## F. Stop condition

If any primary route crashes (White Screen of Death) or a primary demo path button is completely dead, STOP testing and report back immediately. No need to finish the script if the main corridor breaks.
