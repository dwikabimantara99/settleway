# Current Handoff

## Current Candidate

- Candidate branch: `cleanup/main-candidate-2026-06`
- Canonical source branch selected for this candidate: `phase-10-persistence-identity`
- Base candidate commit: `74f73b1add301d61c2b67a536753c6c828b071e1`

## Current Task Boundary

Macro Batch 2 is the final repository consolidation and promotion batch. It may fix CI, remove proven dead weight, remediate dependency risk, update public documentation, validate locally and remotely, promote the green candidate to `main` by fast-forward, tag the baseline, and delete archived obsolete branches.

## No-Touch Areas

- No frontend redesign.
- No new custody contract.
- No bank/QRIS implementation.
- No live secret access.
- No force-push or history rewrite.
- No deletion of untagged remote branches.
- No `main` promotion while candidate CI is red or missing.

## Current Operator Focus

Finish Macro Batch 2 evidence collection. If any local or GitHub-hosted gate fails, fix forward on the candidate branch before touching `main`.
