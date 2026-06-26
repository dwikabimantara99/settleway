# 23 - Custody V2 Application Integration Testnet Proof

Status: automated application-layer Testnet proof completed on `work/custody-v2-app-integration`.

## Scope

This proof covers the first Custody V2 application vertical slice only:

- dedicated application-integration Custody V2.1 contract on Stellar Testnet;
- distinct integration-only Testnet identities;
- application prepare/sign/submit/confirm service pipeline;
- secure-store Stellar CLI signer harness for automated proof only;
- direct `get_deal` contract reads after confirmation;
- raw Stellar RPC event polling, decoding, deduplication, and cursor tracking;
- success settlement;
- buyer-funded funding-expiry refund.

It does not implement production custody, bank rails, mainnet, breach/dispute UI, mediator console, or reputation projection from Custody V2.1 events.

## Starting Point

- Starting branch: `work/custody-v2-app-integration`
- Starting SHA: `4e6871d2ed8ba061b3dda6cab85a673d7c3a739a`
- Accepted contract tag: `v0.3.0-soroban-custody-v2.1`
- Accepted Wasm SHA-256: `76808FB80BDDF432F771FA3106648B47B1E57DBC09FF6847D38719ECD702723C`

## Deployment

- Network: Stellar Testnet
- RPC endpoint: `https://soroban-testnet.stellar.org`
- Network passphrase: `Test SDF Network ; September 2015`
- Contract ID: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`
- Native XLM SAC contract ID: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Deploy transaction: `5ebd96d0b02e8761b9d8ea6e46540ee0e4c0617bfb2e1e8c46f856a174d84166`
- Deploy ledger: `3288466`
- Deploy timestamp: `2026-06-26T06:47:34.000Z`
- Initialize transaction: `ae2340072955200dd0262e50c21e69c99e26dcfbd5068dba5ce81a185d7de4c5`
- Initialize ledger: `3288484`
- Initialize timestamp: `2026-06-26T06:49:04.000Z`

## Public Role Identities

- Deployer: `GAMMNRJFNKHKOPVHYENJWYLFV64DCO6YAIWJGAFCBGNLULYRKBSULWRA`
- Buyer: `GBKDCPZYIKBDVJDBXBURZCAV2N3QS6HDSFLAQ6O37P2ONEMEMTBFWDBA`
- Seller: `GA4JCPSQOPPKUMKYY2RQK5WFIWTWPBUWCBJ2EHTHNREUEB6ASDX4Q4IU`
- Mediator: `GD5DEAIORQAKYJVN6DVQBYR7I2T3HFRV6U3OQEMZ3T4WHL274Y4BVXJ3`
- Treasury: `GDSOYRJWEFYJPLTOLOG775LQJI7S66UYNQ3IJSXWYYZON27HT7EOVLO2`
- Keeper: `GCZVVYK2KVRX4GMM6AQETMOMDXTFW37MYNN5MZZWKXFA27FTLWLZCRAI`

All identities were generated as integration-only Testnet identities through the Stellar CLI secure store. No secret key, seed phrase, signed XDR, or secure-store material is recorded in this repository.

## Contract Configuration Readback

The harness read the contract configuration back from the deployed contract:

- initialized: `true`
- accepted asset: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- treasury: `GDSOYRJWEFYJPLTOLOG775LQJI7S66UYNQ3IJSXWYYZON27HT7EOVLO2`
- interface version: `2`
- policy version: `2`
- success fee bps: `0`
- seller breach treasury bps: `2000`
- buyer breach treasury bps: `2000`

## Scenario A - Integrated Success

- Application deal ID: `custody-v2-app-success-1782461033826`
- Contract deal ID: `54c6741ef8c941c4aec25b673db0306f5c635680f1a22a3bb4a673df5e1ebf39`
- Terms hash: `2b460ef9b416716e66468c7af416963625f83009b4c0c36cbc91b95a850b1619`
- Evidence hash: `e61582ba137a24375c68507ac83e67d3ac7002510d9b013e273f790739fe6bd3`

Transactions:

| Action | Transaction hash | Ledger | Direct-read state |
| --- | --- | ---: | --- |
| CREATE_DEAL | `9f8f96c4253007fdeff95a4a79781068ceb117696de0897caf5c951a38391c18` | 3289382 | TermsPending |
| ACCEPT_TERMS | `8a8ba250e105baff69d1d1eaaff1f6bbd3668b3100bb05592a44bb4a1de003de` | 3289384 | AwaitingFunding |
| FUND_BUYER | `cff823976ef1b473830d4c93264ebf9e574c0397b58e7ff7072f8f76138d7832` | 3289387 | AwaitingFunding |
| FUND_SELLER | `3f7651c17b72f225a7ec104b4d124235ec10febfe6808c3daf13c6d37792d72a` | 3289390 | Active |
| SUBMIT_EVIDENCE | `053065c48bb4b7705c0a2529f444c7e3dd846a7f540a3afe5984a8779644a301` | 3289392 | EvidenceSubmitted |
| ACCEPT_DELIVERY | `4b272e66a5587b6c924c47acf22d4412b4ebcc7e7be41a176d2e79308a996030` | 3289393 | SettledSuccess |

Result:

- Final projection state: `SettledSuccess`
- Final terminal outcome: `SettledSuccess`
- Raw event polling saw `11` events and appended `11` new events.
- Event cursor after ingestion: `0014127843948625919-4294967295`
- Per-deal locked obligation after terminal settlement: `0` by contract distribution invariant.

## Scenario B - Integrated Funding Expiry

- Application deal ID: `custody-v2-app-expiry-1782461104282`
- Contract deal ID: `d0307b1c65779ea8656735f67d1243e94a6936050dbf387fb6fd503a5fa077d1`
- Terms hash: `d45e9b1fbe9312d15210edf09fc0194a73caf25788333297631e92e98b85b091`

Transactions:

| Action | Transaction hash | Ledger | Direct-read state |
| --- | --- | ---: | --- |
| CREATE_DEAL | `78f0e1d6b80c5826db6f90c457067ff6d2baa4e165e9a223b82016fe57768006` | 3289396 | TermsPending |
| ACCEPT_TERMS | `f3735ba2d22e8f9ca76eb80dda1fb2e5db5f231ce121166173ff6e2868659b62` | 3289398 | AwaitingFunding |
| FUND_BUYER | `ca366276995e0b5f28087fed9650014d2e62de6351f04e7df074474db2710d5e` | 3289399 | AwaitingFunding |
| EXPIRE_FUNDING | `5dc58b68d17c30a1b76dd58b8abfef21859e7ac35413719bf5808b9990f90a57` | 3289406 | FundingExpired |

Result:

- Final projection state: `FundingExpired`
- Final terminal outcome: `FundingExpired`
- Raw event polling saw `17` events and appended `6` new events after prior scenario ingestion.
- Event cursor after ingestion: `0014127899783200767-4294967295`
- Per-deal locked obligation after funding-expiry refund: `0` by contract distribution invariant.

## Balance Evidence

Public native XLM balances were read from Horizon Testnet for before/after evidence:

- Buyer before: `9999.6265037`
- Buyer after: `9999.3713882`
- Seller before: `10000.0935118`
- Seller after: `10000.1858185`
- Treasury before: `10000.0000000`
- Treasury after: `10000.0000000`

These balances include network fees and prior Testnet proof activity. The authoritative per-deal financial state remains the direct contract read plus terminal distribution events.

## Automated Evidence

- `npm run proof:custody-v2-app` completed.
- The harness used the application `prepareCustodyV2Operation`, signed via secure-store Stellar CLI aliases, verified signed transaction body fingerprints, submitted through `StellarSdkRpc`, confirmed with `getTransaction`, reconciled with direct `get_deal`, and ingested raw RPC events.
- The harness did not call direct CLI contract functions as a substitute for the application flow.

## Manual Browser Wallet Gate

Freighter remains the browser-user signing path. Manual browser proof remains a founder acceptance gate because this execution environment cannot provide a browser extension wallet session.

Manual proof should capture:

- buyer wallet connected on Testnet;
- seller wallet connected on Testnet;
- CREATE_DEAL, ACCEPT_TERMS, FUND_BUYER, FUND_SELLER, SUBMIT_EVIDENCE, ACCEPT_DELIVERY transaction hashes;
- direct Deal Room state changes after confirmation;
- funding-expiry path with only buyer funded and permissionless keeper expiry.

## Supabase Provisioning

External Supabase provisioning was not performed in this run because no remote Supabase credentials were provided or accessed. Repository and MockStore persistence paths were exercised by automated tests and the proof harness.

## Remaining Limits

- No production custody claim.
- No mainnet claim.
- No bank, QRIS, anchor, KYC, or KYB integration.
- No breach/dispute/reputation application UI in this batch.
- Browser Freighter proof remains manual.
