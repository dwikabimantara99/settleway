# Productization Roadmap

## Current Milestone

Custody V2.1 is the active milestone. It promotes an isolated Soroban custody proof into `main` after final security acceptance, reproducible artifact verification, Testnet evidence review, full gates, remote CI, and release tagging.

## Custody V2.1 Promotion Boundary

- Promote only by fast-forward after green local and remote gates.
- Keep the Aurora frontend, backend route handlers, current Testnet helper rail, and legacy contract behavior unchanged.
- Tag the accepted milestone as `v0.3.0-soroban-custody-v2.1`.
- Stop before application integration.

## Product Engineering Roadmap

1. Complete Custody V2.1 security acceptance and promotion.
2. Review V2.1 architecture and security risks before integration.
3. Define backend integration plan for contract invocation and event indexing.
4. Define reputation projection from V2.1 events.
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
