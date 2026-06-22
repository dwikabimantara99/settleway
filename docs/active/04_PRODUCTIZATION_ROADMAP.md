# Productization Roadmap

## Immediate Candidate Review

1. Review `cleanup/main-candidate-2026-06`.
2. Confirm CI passes on the candidate branch.
3. Review `docs/active/06_MAIN_CONSOLIDATION_REPORT.md`.
4. Decide whether Macro Batch 2 may promote the candidate to `main`.

## Macro Batch 2

- Promote candidate to `main` by merge or fast-forward after review.
- Push `main`.
- Verify GitHub Actions.
- Create release tag.
- Delete old remote phase branches only after confirming archive tags.
- Configure branch protection.

## Product Engineering Roadmap

1. Stabilize candidate as canonical `main`.
2. Finish destination-aware Testnet settlement exit if still required.
3. Define Soroban custody V2 contract.
4. Replace demo-managed custody bridges with contract-enforced token custody.
5. Add constrained dispute and slashing model.
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
