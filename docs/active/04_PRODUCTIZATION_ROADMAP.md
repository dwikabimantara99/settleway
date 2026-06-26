# Productization Roadmap

## Current Milestone

Custody V2.1 has been accepted, promoted to `main`, and tagged as `v0.3.0-soroban-custody-v2.1`.

Current canonical `main` before application integration is:

```text
2654530d3a5fd2c195d5c68c6e0f324fc9a51f55
```

The active milestone is now Custody V2 application integration on:

```text
work/custody-v2-app-integration
```

## Custody V2 Application Integration Boundary

- Preserve the accepted `contracts/trade_assurance_v2` contract and ABI.
- Preserve the completed Aurora frontend direction.
- Preserve the legacy demo/Testnet rail.
- Connect only the wallet-signed Custody V2 success and funding-expiry vertical slice.
- Do not redesign the contract in this batch.
- Do not merge into `main` in this batch.

## Product Engineering Roadmap

1. Implement the wallet-signed Custody V2 success and funding-expiry application vertical slice.
2. Review the integration architecture, security posture, and Testnet evidence.
3. Define the next app integration phase for breach, cancellation, dispute, and reputation projection.
4. Replace demo-managed custody bridges with contract-enforced token custody only after integration acceptance.
5. Add production persistence deployment.
6. Add real authentication hardening.
7. Explore anchor/bank integration only after custody and compliance assumptions are explicit.

## Branch Policy

```text
main = protected canonical product branch
work/<milestone> = short-lived implementation branch
cleanup/<milestone> = repository maintenance branch
productization/<milestone> = release-readiness branch
```

No long-lived phase branches after promotion. No force push to `main`.
