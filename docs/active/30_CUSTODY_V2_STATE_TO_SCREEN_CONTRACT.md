# Custody V2 State-to-Screen Contract

Date: 2026-06-27
Milestone: Recovery 1 - Product Corridor And State To Screen
Authority: `SETTLEWAY_RECOVERY_MILESTONE_1_PRODUCT_CORRIDOR_AND_STATE_TO_SCREEN.md`

This document is the binding interface between product workflow, application state, contract state, wallet role, and Aurora UI. Application code must not introduce a Custody V2 backend state without a deliberate screen, and the UI must not display a primary action without a real runtime transition.

## Rail And Asset Rules

- Rail version: `custody_v2_testnet` only for this corridor.
- Contract: `CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4`.
- Settlement asset: native XLM SAC on Stellar Testnet, labeled `XLM`.
- Commercial IDR values are product context only. On-chain settlement obligations are shown separately in XLM base-unit-derived display values.
- Platform fee is not shown for the V2 Testnet zero-fee milestone.
- A Custody V2 deal must never silently fall back to `legacy_demo`.

## Role Model

| Concept | Meaning | May authorize V2 financial actions? |
| --- | --- | --- |
| Product navigation mode | `Buy` and `Sell` discovery surfaces. | No |
| Authenticated app session | Application user identity for offers, negotiations, notifications, and membership. | No token movement by itself |
| Wallet participant role | Derived from connected Freighter public address matching immutable deal buyer/seller address. | Yes, only for matching role |

Rules:

- Connected address equals deal buyer address -> buyer financial role.
- Connected address equals deal seller address -> seller financial role.
- No connected address -> wallet-required state.
- Unmatched address -> read-only wrong-wallet state.
- `mock_actor` may support demo session rendering but must not authorize V2 financial actions.
- Buyer and seller addresses must be distinct and immutable after canonical terms freeze.

## Shared Custody V2 Deal Room Structure

Every Custody V2 Deal Room screen must show:

- product and quantity;
- buyer and seller names;
- application deal ID;
- badge `Custody V2 · Stellar Testnet`;
- settlement asset `XLM`;
- connected wallet address or missing-wallet state;
- resolved financial role;
- contract ID;
- deterministic contract deal ID;
- canonical terms hash;
- current application and contract state;
- next responsible actor;
- last submitted transaction hash when pending;
- last confirmed transaction hash or ledger when confirmed.

## State Contract

### OFF_CHAIN_TERMS_AGREED

- Authoritative state: offer status `terms_accepted`; no application deal yet, or deal shell not created.
- Rail version: none until Deal Room creation.
- Buyer view: agreed commercial terms, recorded negotiation history, own wallet-binding status, seller wallet status, mutual open progress.
- Seller view: same, with seller wallet-binding responsibility.
- Connected-wallet requirement: required before each party can confirm its wallet slot for V2 room creation.
- Next responsible actor: any party missing wallet binding or open-room approval.
- Primary CTA: `Confirm wallet` or `Open Deal Room` only when prerequisites for that actor are met.
- Secondary CTA: review negotiation, return to marketplace/request.
- Disabled explanation: missing counterparty approval, missing buyer wallet, missing seller wallet, or terms not frozen.
- Pending label: `Preparing Custody V2 room`.
- Confirmed label: `Terms agreed off-chain`.
- Financial amounts shown: commercial IDR context and planned XLM settlement obligations, visually separated.
- Transaction/reference fields: none on-chain yet.
- Error states: wallet unavailable, access rejected, wrong network, duplicate wallet, stale terms.
- Mobile behavior: single-column terms, wallet slots, then action panel.
- Milestone 1 status: implemented.

### ON_CHAIN_DEAL_NOT_CREATED

- Authoritative state: application deal exists with `rail_version='custody_v2_testnet'`; custody link exists; contract state projection is `TermsPending`; no confirmed `CREATE_DEAL` operation.
- Buyer view: primary on-chain action to create the deal.
- Seller view: waiting state explaining buyer must create on Stellar first.
- Connected-wallet requirement: buyer wallet must match immutable buyer address to create; seller can view with seller wallet but cannot act yet.
- Next responsible actor: buyer.
- Primary CTA: buyer `Create on Stellar`; seller none.
- Secondary CTA: copy contract fields, review agreed terms.
- Disabled explanation: no wallet, wrong wallet, wrong network, unavailable Freighter, config mismatch, or pending duplicate operation.
- Pending label: `Creation submitted` after signed submit.
- Confirmed label: `Created on Stellar` after confirmation.
- Financial amounts shown: principal, buyer bond, seller bond in XLM; commercial IDR as context.
- Transaction/reference fields: contract ID, terms hash, contract deal ID, submitted tx hash while pending.
- Error states: prepare failed, simulation failed, rejected signature, signer mismatch, submit failed, confirm timeout, direct read mismatch.
- Mobile behavior: action panel appears before assurance rail, with references collapsible/copyable.
- Milestone 1 status: implemented.

### WAITING_COUNTERPARTY_ACCEPTANCE

- Authoritative state: application link has confirmed `CREATE_DEAL`; contract projection remains `TermsPending`; seller `ACCEPT_TERMS` not confirmed.
- Buyer view: creation confirmed, waiting for seller acceptance; no funding CTA.
- Seller view: primary `Accept terms on Stellar` with immutable terms summary.
- Connected-wallet requirement: seller wallet must match immutable seller address to accept.
- Next responsible actor: seller.
- Primary CTA: seller `Accept terms on Stellar`; buyer none.
- Secondary CTA: copy references, review negotiation.
- Disabled explanation: seller wallet missing/wrong, wrong network, already pending acceptance, or chain mismatch.
- Pending label: `Acceptance submitted`.
- Confirmed label: `Terms accepted on Stellar`.
- Financial amounts shown: all obligations in XLM; no platform fee.
- Transaction/reference fields: buyer creation tx hash, seller acceptance pending/confirmed tx hash, contract state.
- Error states: prepare failed, rejected signature, signer mismatch, submit failed, confirm timeout, direct read mismatch.
- Mobile behavior: seller action card first, then terms references.
- Milestone 1 status: implemented.

### AWAITING_FUNDING

- Authoritative state: contract projection `AwaitingFunding`; confirmed `ACCEPT_TERMS` operation.
- Buyer view: terms accepted, funding obligations visible, funding CTA intentionally disabled until Milestone 2.
- Seller view: same, seller obligation emphasized.
- Connected-wallet requirement: wallet match required to see future funding responsibility; unmatched wallet sees read-only state.
- Next responsible actor: Recovery Milestone 2 funding implementation.
- Primary CTA: none in Milestone 1.
- Secondary CTA: view references, copy hashes, open explorer links.
- Disabled explanation: `Funding actions will be enabled in Recovery Milestone 2`.
- Pending label: none after acceptance confirmed.
- Confirmed label: `Awaiting funding`.
- Financial amounts shown: buyer principal, buyer commitment bond, seller performance bond in XLM; commercial IDR context separate.
- Transaction/reference fields: buyer creation tx, seller acceptance tx, last confirmed ledger, contract state.
- Error states: projection mismatch, stale local state, missing link.
- Mobile behavior: status explanation first, obligations second, references third.
- Milestone 1 status: implemented terminal state for this milestone.

### BUYER_FUNDED

- Authoritative state: future Custody V2 funding projection after buyer fund only.
- Buyer view: buyer funded, waiting seller.
- Seller view: seller funding required.
- Connected-wallet requirement: matching seller wallet for next action.
- Next responsible actor: seller.
- Primary CTA: future `Fund performance bond`.
- Secondary CTA: view funding proof.
- Disabled explanation: out of Milestone 1.
- Pending label: `Buyer funding submitted`.
- Confirmed label: `Buyer funded`.
- Financial amounts shown: buyer funded amount, seller remaining bond.
- Transaction/reference fields: buyer funding tx.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### SELLER_FUNDED

- Authoritative state: future Custody V2 funding projection after seller fund only.
- Buyer view: buyer funding required.
- Seller view: seller funded, waiting buyer.
- Connected-wallet requirement: matching buyer wallet for next action.
- Next responsible actor: buyer.
- Primary CTA: future `Fund principal + commitment bond`.
- Secondary CTA: view funding proof.
- Disabled explanation: out of Milestone 1.
- Pending label: `Seller funding submitted`.
- Confirmed label: `Seller funded`.
- Financial amounts shown: seller funded amount, buyer remaining commitment.
- Transaction/reference fields: seller funding tx.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### ACTIVE_LOCKED

- Authoritative state: future contract projection `Active` after both funding commitments are confirmed.
- Buyer view: escrow locked, delivery/proof pending.
- Seller view: escrow locked, submit evidence next.
- Connected-wallet requirement: matching seller wallet for evidence action.
- Next responsible actor: seller.
- Primary CTA: future `Submit delivery evidence`.
- Secondary CTA: view lock proof.
- Disabled explanation: out of Milestone 1.
- Pending label: `Escrow lock pending`.
- Confirmed label: `Escrow locked`.
- Financial amounts shown: locked obligations in XLM.
- Transaction/reference fields: lock ledger/event.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### EVIDENCE_SUBMITTED

- Authoritative state: future contract projection `EvidenceSubmitted`.
- Buyer view: review evidence and accept/reject path later.
- Seller view: evidence submitted, waiting buyer review.
- Connected-wallet requirement: matching buyer wallet for future accept delivery.
- Next responsible actor: buyer.
- Primary CTA: future `Accept delivery`.
- Secondary CTA: view evidence hash.
- Disabled explanation: out of Milestone 1.
- Pending label: `Evidence submission pending`.
- Confirmed label: `Evidence submitted`.
- Financial amounts shown: locked obligations.
- Transaction/reference fields: evidence hash, tx hash.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### BUYER_REVIEW

- Authoritative state: application review state over evidence submitted.
- Buyer view: buyer review workspace.
- Seller view: waiting buyer review.
- Connected-wallet requirement: matching buyer wallet for future settlement action.
- Next responsible actor: buyer.
- Primary CTA: future `Accept delivery` or dispute path after approved scope.
- Secondary CTA: review evidence.
- Disabled explanation: out of Milestone 1.
- Pending label: `Buyer review active`.
- Confirmed label: none.
- Financial amounts shown: locked obligations.
- Transaction/reference fields: evidence references.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### SETTLED_SUCCESS

- Authoritative state: future terminal contract projection `SettledSuccess`.
- Buyer view: buyer bond returned, principal paid to seller.
- Seller view: seller receives principal and bond returned.
- Connected-wallet requirement: no action; matched wallet improves explanation.
- Next responsible actor: none.
- Primary CTA: none.
- Secondary CTA: view settlement proof.
- Disabled explanation: terminal state.
- Pending label: `Settlement submitted`.
- Confirmed label: `Settled successfully`.
- Financial amounts shown: settlement distribution in XLM and commercial context.
- Transaction/reference fields: settlement tx, ledger, event references.
- Error states: future reconciliation mismatch.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### FUNDING_EXPIRED

- Authoritative state: future terminal projection `FundingExpired`.
- Buyer view: refund/penalty explanation based on funding participation.
- Seller view: same.
- Connected-wallet requirement: no action after terminal.
- Next responsible actor: none.
- Primary CTA: none.
- Secondary CTA: view expiry proof.
- Disabled explanation: terminal state.
- Pending label: `Expiry submitted`.
- Confirmed label: `Funding expired`.
- Financial amounts shown: refunded amounts and missed-party result.
- Transaction/reference fields: expiry tx/event.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### SELLER_BREACH

- Authoritative state: future terminal projection `SellerBreach`.
- Buyer view: buyer-protective outcome explanation.
- Seller view: breach outcome explanation.
- Connected-wallet requirement: no action after terminal.
- Next responsible actor: none.
- Primary CTA: none.
- Secondary CTA: view proof.
- Disabled explanation: terminal state.
- Pending label: future.
- Confirmed label: `Seller breach resolved`.
- Financial amounts shown: future slashing/refund distribution.
- Transaction/reference fields: breach tx/event.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### BUYER_BREACH

- Authoritative state: future terminal projection `BuyerBreach`.
- Buyer view: breach outcome explanation.
- Seller view: seller-protective outcome explanation.
- Connected-wallet requirement: no action after terminal.
- Next responsible actor: none.
- Primary CTA: none.
- Secondary CTA: view proof.
- Disabled explanation: terminal state.
- Pending label: future.
- Confirmed label: `Buyer breach resolved`.
- Financial amounts shown: future slashing/refund distribution.
- Transaction/reference fields: breach tx/event.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### DISPUTED

- Authoritative state: future constrained dispute freeze.
- Buyer view: dispute frozen, mediator review pending.
- Seller view: dispute frozen, mediator review pending.
- Connected-wallet requirement: no normal party action unless future spec allows evidence append.
- Next responsible actor: mediator/operator.
- Primary CTA: none for buyer/seller.
- Secondary CTA: view evidence and conversation history.
- Disabled explanation: dispute under review.
- Pending label: `Dispute frozen`.
- Confirmed label: future mediator resolution.
- Financial amounts shown: locked/frozen obligations.
- Transaction/reference fields: dispute tx/event.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.

### MUTUAL_CANCELLATION

- Authoritative state: future terminal projection `MutualCancellation`.
- Buyer view: cancellation/refund proof.
- Seller view: cancellation/refund proof.
- Connected-wallet requirement: no action after terminal.
- Next responsible actor: none.
- Primary CTA: none.
- Secondary CTA: view cancellation proof.
- Disabled explanation: terminal state.
- Pending label: future.
- Confirmed label: `Mutually cancelled`.
- Financial amounts shown: refund distribution.
- Transaction/reference fields: cancellation tx/event.
- Error states: future.
- Mobile behavior: future.
- Milestone 1 status: documented only.
