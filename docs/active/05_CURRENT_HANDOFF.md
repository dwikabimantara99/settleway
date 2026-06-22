# Current Handoff

## Current Candidate

- Candidate branch: `cleanup/main-candidate-2026-06`
- Canonical source branch selected for this candidate: `phase-10-persistence-identity`
- Base candidate commit: `74f73b1add301d61c2b67a536753c6c828b071e1`

## Current Task Boundary

Macro Batch 1 is a repository consolidation batch. It may archive historical docs, create active documentation, repair CI, run gates, and push the candidate branch and archive tags. It must not modify `main`, delete remote phase branches, force-push, or expose secrets.

## No-Touch Areas

- No `main` promotion in Macro Batch 1.
- No remote branch deletion in Macro Batch 1.
- No frontend redesign.
- No new custody contract.
- No bank/QRIS implementation.
- No live secret access.

## Next Human Review

Review the candidate branch, consolidation report, CI output, and active documentation. If approved, Macro Batch 2 can promote the candidate to `main` and retire phase branches safely.
