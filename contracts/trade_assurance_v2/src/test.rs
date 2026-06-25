#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, Events, Ledger, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, Env, IntoVal, Symbol,
};

const PRINCIPAL: i128 = 1_000_000;
const BUYER_BOND: i128 = 50_003;
const SELLER_BOND: i128 = 50_003;
const SUCCESS_FEE_BPS: u32 = 0;
const BREACH_TREASURY_BPS: u32 = 2_000;

struct Setup {
    env: Env,
    contract_id: Address,
    client: SettlewayCustodyV2Client<'static>,
    token_id: Address,
    token: TokenClient<'static>,
    token_admin: StellarAssetClient<'static>,
    initializer: Address,
    buyer: Address,
    seller: Address,
    mediator: Address,
    treasury: Address,
    other: Address,
}

fn setup() -> Setup {
    let env = Env::default();
    env.ledger().set_timestamp(1_000);
    env.ledger().set_sequence_number(1);

    let initializer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let mediator = Address::generate(&env);
    let treasury = Address::generate(&env);
    let other = Address::generate(&env);
    let token_asset = env.register_stellar_asset_contract_v2(initializer.clone());
    let token_id = token_asset.address();
    let token = TokenClient::new(&env, &token_id);
    let token_admin = StellarAssetClient::new(&env, &token_id);
    let contract_id = env.register(SettlewayCustodyV2, ());
    let client = SettlewayCustodyV2Client::new(&env, &contract_id);

    env.mock_all_auths();
    token_admin.mint(&buyer, &10_000_000);
    token_admin.mint(&seller, &10_000_000);
    token_admin.mint(&other, &10_000_000);
    client.initialize(
        &initializer,
        &token_id,
        &treasury,
        &2,
        &SUCCESS_FEE_BPS,
        &BREACH_TREASURY_BPS,
        &BREACH_TREASURY_BPS,
    );

    Setup {
        env,
        contract_id,
        client,
        token_id,
        token,
        token_admin,
        initializer,
        buyer,
        seller,
        mediator,
        treasury,
        other,
    }
}

fn id(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

fn create_buyer_deal(s: &Setup, deal_id: &BytesN<32>) {
    s.client.create_deal(
        deal_id,
        &s.buyer,
        &s.buyer,
        &s.seller,
        &s.mediator,
        &id(&s.env, 99),
        &PRINCIPAL,
        &BUYER_BOND,
        &SELLER_BOND,
        &2_000,
        &3_000,
        &4_000,
    );
}

fn create_seller_deal(s: &Setup, deal_id: &BytesN<32>) {
    s.client.create_deal(
        deal_id,
        &s.seller,
        &s.buyer,
        &s.seller,
        &s.mediator,
        &id(&s.env, 98),
        &PRINCIPAL,
        &BUYER_BOND,
        &SELLER_BOND,
        &2_000,
        &3_000,
        &4_000,
    );
}

fn accepted_deal(s: &Setup, deal_id: &BytesN<32>) {
    create_buyer_deal(s, deal_id);
    s.client.accept_terms(deal_id, &s.seller);
}

fn active_deal(s: &Setup, deal_id: &BytesN<32>) {
    accepted_deal(s, deal_id);
    s.client.fund_buyer(deal_id, &s.buyer);
    s.client.fund_seller(deal_id, &s.seller);
}

fn evidence_deal(s: &Setup, deal_id: &BytesN<32>) {
    active_deal(s, deal_id);
    s.client
        .submit_evidence(deal_id, &s.seller, &id(&s.env, 77));
}

fn expect_error<T>(
    result: Result<
        Result<T, soroban_sdk::ConversionError>,
        Result<ContractError, soroban_sdk::InvokeError>,
    >,
    err: ContractError,
) where
    T: core::fmt::Debug,
{
    match result {
        Err(Ok(actual)) => assert_eq!(actual, err),
        other => panic!("expected {err:?}, got {other:?}"),
    }
}

fn last_events_contain(s: &Setup, expected: &str) {
    let events = std::format!("{:?}", s.env.events().all());
    assert!(
        events.contains(expected),
        "missing event {expected}: {events}"
    );
}

fn locked_total() -> i128 {
    PRINCIPAL + BUYER_BOND + SELLER_BOND
}

fn breach_treasury_share(amount: i128) -> i128 {
    amount * BREACH_TREASURY_BPS as i128 / 10_000
}

#[test]
fn initialize_sets_policy_once_and_validates_inputs() {
    let s = setup();
    let config = s.client.get_config();
    assert_eq!(config.accepted_asset, s.token_id);
    assert_eq!(config.treasury, s.treasury);
    assert_eq!(config.policy_version, 2);
    assert_eq!(config.interface_version, POLICY_INTERFACE_VERSION);
    assert_eq!(config.success_fee_bps, 0);
    assert_eq!(config.seller_breach_treasury_bps, 2_000);
    assert_eq!(config.buyer_breach_treasury_bps, 2_000);

    expect_error(
        s.client.try_initialize(
            &s.initializer,
            &s.token_id,
            &s.treasury,
            &2,
            &0,
            &2_000,
            &2_000,
        ),
        ContractError::AlreadyInitialized,
    );
}

#[test]
fn initialize_rejects_bad_policy_values_before_persisting_config() {
    let env = Env::default();
    let initializer = Address::generate(&env);
    let treasury = Address::generate(&env);
    let token_id = env
        .register_stellar_asset_contract_v2(initializer.clone())
        .address();
    let contract_id = env.register(SettlewayCustodyV2, ());
    let client = SettlewayCustodyV2Client::new(&env, &contract_id);
    env.mock_all_auths();

    expect_error(
        client.try_initialize(&initializer, &token_id, &treasury, &0, &0, &2_000, &2_000),
        ContractError::InvalidPolicyVersion,
    );
    expect_error(
        client.try_initialize(
            &initializer,
            &token_id,
            &treasury,
            &2,
            &10_001,
            &2_000,
            &2_000,
        ),
        ContractError::InvalidBasisPoints,
    );
    expect_error(
        client.try_initialize(&initializer, &token_id, &token_id, &2, &0, &2_000, &2_000),
        ContractError::InvalidTreasury,
    );
    let has_config = env.as_contract(&contract_id, || {
        env.storage().instance().has(&DataKey::Config)
    });
    assert!(!has_config);
}

#[test]
fn initialize_requires_initializer_auth() {
    let env = Env::default();
    let initializer = Address::generate(&env);
    let malicious = Address::generate(&env);
    let treasury = Address::generate(&env);
    let token_id = env
        .register_stellar_asset_contract_v2(initializer.clone())
        .address();
    let contract_id = env.register(SettlewayCustodyV2, ());
    let client = SettlewayCustodyV2Client::new(&env, &contract_id);

    let _ = client
        .mock_auths(&[MockAuth {
            address: &malicious,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "initialize",
                args: (
                    &initializer,
                    &token_id,
                    &treasury,
                    2u32,
                    0u32,
                    2_000u32,
                    2_000u32,
                )
                    .into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_initialize(&initializer, &token_id, &treasury, &2, &0, &2_000, &2_000)
        .unwrap_err();
}

#[test]
fn create_deal_snapshots_policy_and_creator_acceptance() {
    let s = setup();
    let buyer_id = id(&s.env, 1);
    create_buyer_deal(&s, &buyer_id);
    let buyer_deal = s.client.get_deal(&buyer_id);
    assert!(buyer_deal.buyer_terms_accepted);
    assert!(!buyer_deal.seller_terms_accepted);
    assert_eq!(buyer_deal.mediator, s.mediator);
    assert_eq!(buyer_deal.treasury, s.treasury);
    assert_eq!(buyer_deal.success_fee_bps, SUCCESS_FEE_BPS);
    assert_eq!(buyer_deal.seller_breach_treasury_bps, BREACH_TREASURY_BPS);

    let seller_id = id(&s.env, 2);
    create_seller_deal(&s, &seller_id);
    let seller_deal = s.client.get_deal(&seller_id);
    assert!(!seller_deal.buyer_terms_accepted);
    assert!(seller_deal.seller_terms_accepted);
}

#[test]
fn create_deal_rejects_invalid_parties_amounts_deadlines_and_duplicates() {
    let s = setup();
    let deal_id = id(&s.env, 3);
    expect_error(
        s.client.try_create_deal(
            &deal_id,
            &s.other,
            &s.buyer,
            &s.seller,
            &s.mediator,
            &id(&s.env, 99),
            &PRINCIPAL,
            &BUYER_BOND,
            &SELLER_BOND,
            &2_000,
            &3_000,
            &4_000,
        ),
        ContractError::UnauthorizedParticipant,
    );
    expect_error(
        s.client.try_create_deal(
            &id(&s.env, 4),
            &s.buyer,
            &s.buyer,
            &s.buyer,
            &s.mediator,
            &id(&s.env, 99),
            &PRINCIPAL,
            &BUYER_BOND,
            &SELLER_BOND,
            &2_000,
            &3_000,
            &4_000,
        ),
        ContractError::BuyerSellerSame,
    );
    expect_error(
        s.client.try_create_deal(
            &id(&s.env, 5),
            &s.buyer,
            &s.buyer,
            &s.seller,
            &s.buyer,
            &id(&s.env, 99),
            &PRINCIPAL,
            &BUYER_BOND,
            &SELLER_BOND,
            &2_000,
            &3_000,
            &4_000,
        ),
        ContractError::InvalidMediator,
    );
    expect_error(
        s.client.try_create_deal(
            &id(&s.env, 6),
            &s.buyer,
            &s.buyer,
            &s.seller,
            &s.mediator,
            &id(&s.env, 99),
            &0,
            &BUYER_BOND,
            &SELLER_BOND,
            &2_000,
            &3_000,
            &4_000,
        ),
        ContractError::InvalidAmount,
    );
    expect_error(
        s.client.try_create_deal(
            &id(&s.env, 7),
            &s.buyer,
            &s.buyer,
            &s.seller,
            &s.mediator,
            &id(&s.env, 99),
            &PRINCIPAL,
            &BUYER_BOND,
            &SELLER_BOND,
            &2_000,
            &2_000,
            &4_000,
        ),
        ContractError::InvalidDeadline,
    );
    create_buyer_deal(&s, &deal_id);
    expect_error(
        s.client.try_create_deal(
            &deal_id,
            &s.buyer,
            &s.buyer,
            &s.seller,
            &s.mediator,
            &id(&s.env, 99),
            &PRINCIPAL,
            &BUYER_BOND,
            &SELLER_BOND,
            &2_000,
            &3_000,
            &4_000,
        ),
        ContractError::DuplicateDeal,
    );
}

#[test]
fn accept_terms_moves_to_funding_gate_and_rejects_unrelated_or_duplicate() {
    let s = setup();
    let deal_id = id(&s.env, 8);
    create_buyer_deal(&s, &deal_id);
    expect_error(
        s.client.try_accept_terms(&deal_id, &s.other),
        ContractError::UnauthorizedParticipant,
    );
    expect_error(
        s.client.try_accept_terms(&deal_id, &s.buyer),
        ContractError::TermsAlreadyAccepted,
    );
    s.client.accept_terms(&deal_id, &s.seller);
    assert_eq!(s.client.get_state(&deal_id), DealState::AwaitingFunding);
}

#[test]
fn funding_boundary_has_no_dead_zone() {
    let s = setup();
    let before_deadline_id = id(&s.env, 9);
    accepted_deal(&s, &before_deadline_id);
    s.env.ledger().set_timestamp(1_999);
    s.client.fund_buyer(&before_deadline_id, &s.buyer);
    expect_error(
        s.client.try_expire_funding(&before_deadline_id),
        ContractError::FundingDeadlineOpen,
    );

    let at_deadline_id = id(&s.env, 10);
    s.env.ledger().set_timestamp(1_000);
    accepted_deal(&s, &at_deadline_id);
    s.env.ledger().set_timestamp(2_000);
    expect_error(
        s.client.try_fund_buyer(&at_deadline_id, &s.buyer),
        ContractError::FundingDeadlinePassed,
    );
    s.client.expire_funding(&at_deadline_id);
    assert_eq!(
        s.client.get_state(&at_deadline_id),
        DealState::FundingExpired
    );
}

#[test]
fn buyer_and_seller_funding_locks_exact_amounts_then_activates() {
    let s = setup();
    let deal_id = id(&s.env, 11);
    accepted_deal(&s, &deal_id);
    let buyer_start = s.token.balance(&s.buyer);
    let seller_start = s.token.balance(&s.seller);
    s.client.fund_buyer(&deal_id, &s.buyer);
    assert_eq!(
        s.token.balance(&s.buyer),
        buyer_start - PRINCIPAL - BUYER_BOND
    );
    assert_eq!(s.client.get_state(&deal_id), DealState::AwaitingFunding);
    s.client.fund_seller(&deal_id, &s.seller);
    assert_eq!(s.token.balance(&s.seller), seller_start - SELLER_BOND);
    assert_eq!(s.token.balance(&s.contract_id), locked_total());
    assert_eq!(s.client.get_state(&deal_id), DealState::Active);
}

#[test]
fn funding_rejects_wrong_caller_duplicate_and_overflow_atomically() {
    let s = setup();
    let deal_id = id(&s.env, 12);
    accepted_deal(&s, &deal_id);
    expect_error(
        s.client.try_fund_buyer(&deal_id, &s.other),
        ContractError::UnauthorizedParticipant,
    );
    s.client.fund_buyer(&deal_id, &s.buyer);
    let contract_balance = s.token.balance(&s.contract_id);
    expect_error(
        s.client.try_fund_buyer(&deal_id, &s.buyer),
        ContractError::AlreadyFunded,
    );
    assert_eq!(s.token.balance(&s.contract_id), contract_balance);

    let overflow_id = id(&s.env, 13);
    s.client.create_deal(
        &overflow_id,
        &s.buyer,
        &s.buyer,
        &s.seller,
        &s.mediator,
        &id(&s.env, 99),
        &i128::MAX,
        &1,
        &SELLER_BOND,
        &2_000,
        &3_000,
        &4_000,
    );
    s.client.accept_terms(&overflow_id, &s.seller);
    expect_error(
        s.client.try_fund_buyer(&overflow_id, &s.buyer),
        ContractError::AmountOverflow,
    );
    assert!(!s.client.get_deal(&overflow_id).buyer_funded);
}

#[test]
fn funding_expiry_refunds_only_actual_funders() {
    let s = setup();
    let buyer_only = id(&s.env, 14);
    accepted_deal(&s, &buyer_only);
    let buyer_start = s.token.balance(&s.buyer);
    s.client.fund_buyer(&buyer_only, &s.buyer);
    s.env.ledger().set_timestamp(2_000);
    s.client.expire_funding(&buyer_only);
    assert_eq!(s.token.balance(&s.buyer), buyer_start);
    assert_eq!(
        s.client.get_deal(&buyer_only).terminal_outcome,
        TerminalOutcome::FundingExpired
    );

    let seller_only = id(&s.env, 15);
    s.env.ledger().set_timestamp(1_000);
    accepted_deal(&s, &seller_only);
    let seller_start = s.token.balance(&s.seller);
    s.client.fund_seller(&seller_only, &s.seller);
    s.env.ledger().set_timestamp(2_001);
    s.client.expire_funding(&seller_only);
    assert_eq!(s.token.balance(&s.seller), seller_start);
}

#[test]
fn delivery_boundary_and_seller_breach_distribution_are_exact() {
    let s = setup();
    let before = id(&s.env, 16);
    active_deal(&s, &before);
    s.env.ledger().set_timestamp(2_999);
    s.client
        .submit_evidence(&before, &s.seller, &id(&s.env, 77));
    expect_error(
        s.client.try_expire_delivery(&before),
        ContractError::InvalidState,
    );

    let at = id(&s.env, 17);
    s.env.ledger().set_timestamp(1_000);
    active_deal(&s, &at);
    s.env.ledger().set_timestamp(2_999);
    expect_error(
        s.client.try_expire_delivery(&at),
        ContractError::DeliveryDeadlineOpen,
    );
    s.env.ledger().set_timestamp(3_000);
    expect_error(
        s.client
            .try_submit_evidence(&at, &s.seller, &id(&s.env, 78)),
        ContractError::DeliveryDeadlinePassed,
    );

    let buyer_after_funding = s.token.balance(&s.buyer);
    let treasury_before = s.token.balance(&s.treasury);
    s.client.expire_delivery(&at);
    let treasury_share = breach_treasury_share(SELLER_BOND);
    let harmed_share = SELLER_BOND - treasury_share;
    assert_eq!(
        s.token.balance(&s.buyer),
        buyer_after_funding + PRINCIPAL + BUYER_BOND + harmed_share
    );
    assert_eq!(
        s.token.balance(&s.treasury),
        treasury_before + treasury_share
    );
    assert_eq!(s.client.get_state(&at), DealState::SellerBreach);
    assert_eq!(
        s.client.get_deal(&at).terminal_outcome,
        TerminalOutcome::SellerBreach
    );
    expect_error(
        s.client.try_expire_delivery(&at),
        ContractError::TerminalState,
    );
}

#[test]
fn inspection_boundary_and_buyer_breach_distribution_are_exact() {
    let s = setup();
    let before = id(&s.env, 18);
    evidence_deal(&s, &before);
    s.env.ledger().set_timestamp(3_999);
    s.client.accept_delivery(&before, &s.buyer);
    assert_eq!(s.client.get_state(&before), DealState::SettledSuccess);

    let at = id(&s.env, 19);
    s.env.ledger().set_timestamp(1_000);
    evidence_deal(&s, &at);
    s.env.ledger().set_timestamp(3_999);
    expect_error(
        s.client.try_expire_inspection(&at),
        ContractError::InspectionDeadlineOpen,
    );
    s.env.ledger().set_timestamp(4_000);
    expect_error(
        s.client.try_accept_delivery(&at, &s.buyer),
        ContractError::InspectionDeadlinePassed,
    );

    let seller_after_funding = s.token.balance(&s.seller);
    let treasury_before = s.token.balance(&s.treasury);
    s.client.expire_inspection(&at);
    let treasury_share = breach_treasury_share(BUYER_BOND);
    let harmed_share = BUYER_BOND - treasury_share;
    assert_eq!(
        s.token.balance(&s.seller),
        seller_after_funding + PRINCIPAL + SELLER_BOND + harmed_share
    );
    assert_eq!(
        s.token.balance(&s.treasury),
        treasury_before + treasury_share
    );
    assert_eq!(s.client.get_state(&at), DealState::BuyerBreach);
    assert_eq!(
        s.client.get_deal(&at).terminal_outcome,
        TerminalOutcome::BuyerBreach
    );
}

#[test]
fn success_settlement_uses_configured_zero_fee_and_is_terminal() {
    let s = setup();
    let deal_id = id(&s.env, 20);
    evidence_deal(&s, &deal_id);
    let buyer_after_funding = s.token.balance(&s.buyer);
    let seller_after_funding = s.token.balance(&s.seller);
    let treasury_before = s.token.balance(&s.treasury);
    s.client.accept_delivery(&deal_id, &s.buyer);
    assert_eq!(s.token.balance(&s.buyer), buyer_after_funding + BUYER_BOND);
    assert_eq!(
        s.token.balance(&s.seller),
        seller_after_funding + PRINCIPAL + SELLER_BOND
    );
    assert_eq!(s.token.balance(&s.treasury), treasury_before);
    assert_eq!(s.client.get_state(&deal_id), DealState::SettledSuccess);
    expect_error(
        s.client.try_accept_delivery(&deal_id, &s.buyer),
        ContractError::TerminalState,
    );
}

#[test]
fn mutual_cancellation_requires_two_distinct_participants_and_refunds_without_treasury() {
    let s = setup();
    let deal_id = id(&s.env, 21);
    active_deal(&s, &deal_id);
    let buyer_after_funding = s.token.balance(&s.buyer);
    let seller_after_funding = s.token.balance(&s.seller);
    let treasury_before = s.token.balance(&s.treasury);

    s.client.approve_mutual_cancellation(&deal_id, &s.buyer);
    assert_eq!(s.client.get_state(&deal_id), DealState::Active);
    assert_eq!(s.token.balance(&s.buyer), buyer_after_funding);
    expect_error(
        s.client.try_approve_mutual_cancellation(&deal_id, &s.buyer),
        ContractError::CancellationAlreadyApproved,
    );

    s.client.approve_mutual_cancellation(&deal_id, &s.seller);
    assert_eq!(s.client.get_state(&deal_id), DealState::MutualCancellation);
    assert_eq!(
        s.token.balance(&s.buyer),
        buyer_after_funding + PRINCIPAL + BUYER_BOND
    );
    assert_eq!(
        s.token.balance(&s.seller),
        seller_after_funding + SELLER_BOND
    );
    assert_eq!(s.token.balance(&s.treasury), treasury_before);
}

#[test]
fn mutual_cancellation_works_in_either_order_and_fails_after_evidence_or_dispute() {
    let s = setup();
    let reverse = id(&s.env, 22);
    active_deal(&s, &reverse);
    s.client.approve_mutual_cancellation(&reverse, &s.seller);
    s.client.approve_mutual_cancellation(&reverse, &s.buyer);
    assert_eq!(s.client.get_state(&reverse), DealState::MutualCancellation);

    let after_evidence = id(&s.env, 23);
    evidence_deal(&s, &after_evidence);
    expect_error(
        s.client
            .try_approve_mutual_cancellation(&after_evidence, &s.buyer),
        ContractError::InvalidState,
    );

    let disputed = id(&s.env, 24);
    s.env.ledger().set_timestamp(1_000);
    active_deal(&s, &disputed);
    s.client.raise_dispute(&disputed, &s.buyer, &id(&s.env, 88));
    expect_error(
        s.client
            .try_approve_mutual_cancellation(&disputed, &s.seller),
        ContractError::InvalidState,
    );
}

#[test]
fn dispute_can_open_from_eligible_states_and_freezes_ordinary_paths() {
    let s = setup();
    let active = id(&s.env, 25);
    active_deal(&s, &active);
    expect_error(
        s.client
            .try_raise_dispute(&active, &s.other, &id(&s.env, 88)),
        ContractError::UnauthorizedParticipant,
    );
    s.client.raise_dispute(&active, &s.buyer, &id(&s.env, 88));
    assert_eq!(s.client.get_state(&active), DealState::Disputed);
    expect_error(
        s.client
            .try_submit_evidence(&active, &s.seller, &id(&s.env, 77)),
        ContractError::InvalidState,
    );
    expect_error(
        s.client.try_expire_delivery(&active),
        ContractError::InvalidState,
    );

    let evidence = id(&s.env, 26);
    s.env.ledger().set_timestamp(1_000);
    evidence_deal(&s, &evidence);
    s.client
        .raise_dispute(&evidence, &s.seller, &id(&s.env, 89));
    assert_eq!(s.client.get_state(&evidence), DealState::Disputed);
    expect_error(
        s.client.try_accept_delivery(&evidence, &s.buyer),
        ContractError::InvalidState,
    );
    expect_error(
        s.client.try_expire_inspection(&evidence),
        ContractError::InvalidState,
    );
}

#[test]
fn dispute_deadline_boundaries_are_enforced() {
    let s = setup();
    let active = id(&s.env, 27);
    active_deal(&s, &active);
    s.env.ledger().set_timestamp(2_999);
    s.client.raise_dispute(&active, &s.buyer, &id(&s.env, 88));

    let late_active = id(&s.env, 28);
    s.env.ledger().set_timestamp(1_000);
    active_deal(&s, &late_active);
    s.env.ledger().set_timestamp(3_000);
    expect_error(
        s.client
            .try_raise_dispute(&late_active, &s.buyer, &id(&s.env, 88)),
        ContractError::DeliveryDeadlinePassed,
    );

    let late_evidence = id(&s.env, 29);
    s.env.ledger().set_timestamp(1_000);
    evidence_deal(&s, &late_evidence);
    s.env.ledger().set_timestamp(4_000);
    expect_error(
        s.client
            .try_raise_dispute(&late_evidence, &s.seller, &id(&s.env, 88)),
        ContractError::InspectionDeadlinePassed,
    );
}

#[test]
fn only_mediator_resolves_dispute_and_success_requires_evidence() {
    let s = setup();
    let active = id(&s.env, 30);
    active_deal(&s, &active);
    s.client.raise_dispute(&active, &s.buyer, &id(&s.env, 88));
    expect_error(
        s.client
            .try_resolve_dispute(&active, &s.other, &DisputeOutcome::SellerBreach),
        ContractError::UnauthorizedParticipant,
    );
    expect_error(
        s.client
            .try_resolve_dispute(&active, &s.mediator, &DisputeOutcome::SettledSuccess),
        ContractError::EvidenceRequired,
    );
    assert_eq!(s.client.get_state(&active), DealState::Disputed);
    s.client
        .resolve_dispute(&active, &s.mediator, &DisputeOutcome::SellerBreach);
    assert_eq!(s.client.get_state(&active), DealState::SellerBreach);
    expect_error(
        s.client
            .try_resolve_dispute(&active, &s.mediator, &DisputeOutcome::SellerBreach),
        ContractError::TerminalState,
    );
}

#[test]
fn mediator_can_resolve_dispute_to_each_finite_policy_outcome() {
    let s = setup();
    let success = id(&s.env, 31);
    evidence_deal(&s, &success);
    s.client.raise_dispute(&success, &s.seller, &id(&s.env, 88));
    s.client
        .resolve_dispute(&success, &s.mediator, &DisputeOutcome::SettledSuccess);
    assert_eq!(s.client.get_state(&success), DealState::SettledSuccess);

    let buyer_breach = id(&s.env, 32);
    s.env.ledger().set_timestamp(1_000);
    evidence_deal(&s, &buyer_breach);
    s.client
        .raise_dispute(&buyer_breach, &s.buyer, &id(&s.env, 88));
    s.client
        .resolve_dispute(&buyer_breach, &s.mediator, &DisputeOutcome::BuyerBreach);
    assert_eq!(s.client.get_state(&buyer_breach), DealState::BuyerBreach);

    let mutual = id(&s.env, 33);
    s.env.ledger().set_timestamp(1_000);
    active_deal(&s, &mutual);
    s.client.raise_dispute(&mutual, &s.buyer, &id(&s.env, 88));
    s.client
        .resolve_dispute(&mutual, &s.mediator, &DisputeOutcome::MutualCancellation);
    assert_eq!(s.client.get_state(&mutual), DealState::MutualCancellation);
}

#[test]
fn concurrent_deals_preserve_each_others_locked_balance() {
    let s = setup();
    let open = id(&s.env, 34);
    active_deal(&s, &open);

    let success = id(&s.env, 35);
    evidence_deal(&s, &success);
    s.client.accept_delivery(&success, &s.buyer);

    let seller_breach = id(&s.env, 36);
    s.env.ledger().set_timestamp(1_000);
    active_deal(&s, &seller_breach);
    s.env.ledger().set_timestamp(3_000);
    s.client.expire_delivery(&seller_breach);

    assert_eq!(s.token.balance(&s.contract_id), locked_total());
    assert_eq!(s.client.get_state(&open), DealState::Active);
}

#[test]
fn max_supported_amount_checked_multiplication_fails_atomically() {
    let s = setup();
    let deal_id = id(&s.env, 37);
    let huge_seller_bond = i128::MAX / 2;
    s.token_admin.mint(&s.seller, &huge_seller_bond);
    s.client.create_deal(
        &deal_id,
        &s.buyer,
        &s.buyer,
        &s.seller,
        &s.mediator,
        &id(&s.env, 99),
        &100,
        &100,
        &huge_seller_bond,
        &2_000,
        &3_000,
        &4_000,
    );
    s.client.accept_terms(&deal_id, &s.seller);
    s.client.fund_buyer(&deal_id, &s.buyer);
    s.client.fund_seller(&deal_id, &s.seller);
    s.env.ledger().set_timestamp(3_000);
    let contract_before = s.token.balance(&s.contract_id);
    expect_error(
        s.client.try_expire_delivery(&deal_id),
        ContractError::AmountOverflow,
    );
    assert_eq!(s.client.get_state(&deal_id), DealState::Active);
    assert_eq!(s.token.balance(&s.contract_id), contract_before);
}

#[test]
fn participant_and_token_transfer_auth_tree_is_visible() {
    let s = setup();
    let deal_id = id(&s.env, 38);
    accepted_deal(&s, &deal_id);
    s.client.fund_buyer(&deal_id, &s.buyer);
    let auths = s.env.auths();
    assert!(auths.iter().any(|(address, invocation)| {
        *address == s.buyer
            && matches!(
                &invocation.function,
                AuthorizedFunction::Contract((contract, symbol, _))
                    if contract == &s.contract_id && symbol == &Symbol::new(&s.env, "fund_buyer")
            )
            && !invocation.sub_invocations.is_empty()
    }));
}

#[test]
fn dispute_resolution_auth_tree_is_visible() {
    let s = setup();
    let deal_id = id(&s.env, 39);
    active_deal(&s, &deal_id);
    s.client.raise_dispute(&deal_id, &s.buyer, &id(&s.env, 88));
    s.client
        .resolve_dispute(&deal_id, &s.mediator, &DisputeOutcome::SellerBreach);
    let auths = s.env.auths();
    assert!(auths.iter().any(|(address, invocation)| {
        *address == s.mediator
            && matches!(
                &invocation.function,
                AuthorizedFunction::Contract((contract, symbol, _))
                    if contract == &s.contract_id
                        && symbol == &Symbol::new(&s.env, "resolve_dispute")
            )
    }));
}

#[test]
fn events_include_material_transition_facts_without_private_terms() {
    let s = setup();
    last_events_contain(&s, "init");
    let deal_id = id(&s.env, 40);
    active_deal(&s, &deal_id);
    last_events_contain(&s, "active");
    s.client.raise_dispute(&deal_id, &s.buyer, &id(&s.env, 88));
    last_events_contain(&s, "dispute");
    s.client
        .resolve_dispute(&deal_id, &s.mediator, &DisputeOutcome::SellerBreach);
    last_events_contain(&s, "resolve");
    last_events_contain(&s, "settlement");
    let events = std::format!("{:?}", s.env.events().all());
    assert!(!events.contains("commercial contract text"));
}

#[test]
fn read_functions_return_v2_1_facts() {
    let s = setup();
    let deal_id = id(&s.env, 41);
    assert!(!s.client.deal_exists(&deal_id));
    create_buyer_deal(&s, &deal_id);
    assert!(s.client.deal_exists(&deal_id));
    let info = s.client.contract_info();
    assert_eq!(info.interface_version, POLICY_INTERFACE_VERSION);
    assert_eq!(info.policy_version, 2);
    assert_eq!(
        info.name,
        String::from_str(&s.env, "settleway_trade_assurance_v2_1")
    );
}

#[test]
fn storage_ttl_is_extended_for_instance_and_deal() {
    use soroban_sdk::testutils::storage::{Instance, Persistent};

    let s = setup();
    let deal_id = id(&s.env, 42);
    create_buyer_deal(&s, &deal_id);

    let (instance_ttl, deal_ttl) = s.env.as_contract(&s.contract_id, || {
        (
            s.env.storage().instance().get_ttl(),
            s.env
                .storage()
                .persistent()
                .get_ttl(&DataKey::Deal(deal_id)),
        )
    });
    assert!(instance_ttl >= INSTANCE_TTL_THRESHOLD);
    assert!(deal_ttl >= DEAL_TTL_THRESHOLD);
}
