# Current Handoff

## Current Candidate

- Candidate branch: `work/soroban-custody-v2`
- Candidate contract commit before final acceptance docs: `442eb0b2817fe40d2d07b7db8f969d54ed771ad9`
- Canonical `origin/main` before promotion: `693da68289c17b8b97eaeeea707d0ebd877175d6`

## Current Task Boundary

Custody V2.1 final acceptance may review the isolated contract, verify reproducible Wasm and interface coherence, verify Testnet proof evidence, update active documentation, run full local and remote gates, fast-forward promote to `main`, tag `v0.3.0-soroban-custody-v2.1`, and delete the completed milestone branch.

## No-Touch Areas

- No frontend redesign.
- No application integration.
- No backend contract invocation work.
- No event indexer or reputation projection work.
- No bank/QRIS/anchor/KYC/KYB implementation.
- No live secret exposure.
- No force-push or history rewrite.
- No `main` promotion while candidate CI is red, incomplete, or ancestry is not fast-forward.

## Current Operator Focus

Finish Custody V2.1 final acceptance. If any local or GitHub-hosted gate fails, fix forward on `work/soroban-custody-v2` before touching `main`.
