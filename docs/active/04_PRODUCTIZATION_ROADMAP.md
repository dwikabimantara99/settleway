# Productization Roadmap

## Current Milestone

Recovery Milestone 1 rebuilds the normal product corridor for Custody V2 from clean `main` on `recovery/custody-v2-product-corridor-1`.

The milestone creates one real `custody_v2_testnet` Deal Room through normal offer acceptance and mutual Open Deal Room commitment, then exposes only the first wallet-signed vertical slice: buyer `Create on Stellar` readiness and seller acceptance readiness.

## Recovery Milestone 1 Boundary

- Do not continue development on `work/custody-v2-app-integration`; it remains quarantined.
- Do not merge the quarantined branch.
- Do not use a development setup route as product flow.
- Do not implement funding, evidence, settlement, breach, dispute, cancellation, or reputation projection in this milestone.
- Stop before merging to `main`.

## Product Engineering Roadmap

1. Complete founder browser acceptance for buyer `Create on Stellar` and seller `Accept terms on Stellar`.
2. Recovery Milestone 2: implement buyer/seller funding, escrow lock, and funding expiry on the normal Custody V2 corridor.
3. Recovery Milestone 3: implement delivery evidence, buyer review, and success settlement.
4. Define event-driven reputation projection from V2.1 events.
5. Replace demo-managed custody bridges with contract-enforced token custody only after integration acceptance.
6. Add production persistence deployment.
7. Add real authentication hardening.
8. Explore anchor/bank integration only after custody and compliance assumptions are explicit.

## Branch Policy

```text
main = protected canonical product branch
work/<milestone> = short-lived implementation branch
cleanup/<milestone> = repository maintenance branch
productization/<milestone> = release-readiness branch
```

No long-lived phase branches after promotion. No force push to `main`.
