# 14 - Risk Register

## R1 - Soroban token custody too complex

Likelihood: Medium. Impact: High.

Mitigation: Build event-contract mode first. Upgrade to token custody only if time remains.

## R2 - UI becomes broad but core Deal Room fails

Likelihood: High. Impact: High.

Mitigation: Finish Deal Room flow before secondary dashboards.

## R3 - Backend and frontend state diverge

Likelihood: Medium. Impact: High.

Mitigation: Centralize escrow transitions in one state-machine module.

## R4 - Gemini overbuilds production features

Likelihood: High. Impact: High.

Mitigation: Use prompts and guardrails. Stop after every phase.

## R5 - Demo depends on external services failing

Likelihood: Medium. Impact: Medium.

Mitigation: Keep demo fallback mode visible and honest.

## R6 - Product story gets lost in crypto details

Likelihood: Medium. Impact: High.

Mitigation: Landing and Deal Room must explain agricultural trade first, Stellar second.
