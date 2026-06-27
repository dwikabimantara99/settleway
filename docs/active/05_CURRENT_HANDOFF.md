# Current Handoff

## Current Candidate

- Candidate branch: `recovery/custody-v2-product-corridor-1`
- Baseline: `main` at `2654530d3a5fd2c195d5c68c6e0f324fc9a51f55`
- Quarantined parts branch: `work/custody-v2-app-integration`
- Accepted application-integration contract: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`

## Current Task Boundary

Recovery Milestone 1 rebuilds the normal marketplace/offer/open-room path so it creates a `custody_v2_testnet` Deal Room without a development setup route.

Implemented slice:

- accepted offer;
- wallet binding requirement;
- mutual Open Deal Room;
- explicit Custody V2 rail assignment;
- canonical terms freeze;
- real `/deals` discovery;
- buyer `Create on Stellar` readiness;
- seller waiting state before buyer creation.

## No-Touch Areas

- Do not merge into `main` in this milestone.
- Do not continue work on `work/custody-v2-app-integration`.
- Do not implement funding, evidence, settlement, breach, dispute, cancellation, or reputation actions yet.
- Do not claim production custody, real bank/QRIS/anchor, KYC/KYB, or mainnet readiness.
- Do not expose secrets or private keys.
- Do not force-push or rewrite public history.

## Current Operator Focus

Complete founder browser acceptance in two Edge profiles:

1. buyer Freighter wallet signs `Create on Stellar`;
2. seller Freighter wallet signs `Accept terms on Stellar`;
3. final shared Deal Room state reaches `Awaiting funding`;
4. stop before funding implementation.
