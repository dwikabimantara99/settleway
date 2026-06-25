#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, Events, Ledger, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, Env, IntoVal, Symbol,
};

const PRINCIPAL: i128 = 1_000_000;
const BUYER_BOND: i128 = 50_000;
const SELLER_BOND: i128 = 50_000;

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
    other: Address,
}

fn setup() -> Setup {
    let env = Env::default();
    env.ledger().set_timestamp(1_000);
    env.ledger().set_sequence_number(1);

    let initializer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
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
    client.initialize(&initializer, &token_id, &1);

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

#[test]
fn initialize_succeeds_once_and_sets_immutable_asset() {
    let s = setup();
    let config = s.client.get_config();
    assert!(config.initialized);
    assert_eq!(config.accepted_asset, s.token_id);
    assert_eq!(config.policy_version, 1);
    expect_error(
        s.client.try_initialize(&s.initializer, &s.token_id, &1),
        ContractError::AlreadyInitialized,
    );
}

#[test]
fn initialize_requires_auth() {
    let env = Env::default();
    let initializer = Address::generate(&env);
    let malicious = Address::generate(&env);
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
                args: (&initializer, &token_id, 1u32).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_initialize(&initializer, &token_id, &1)
        .unwrap_err();
}

#[test]
fn buyer_and_seller_can_create_deals_with_creator_acceptance() {
    let s = setup();
    let buyer_id = id(&s.env, 1);
    create_buyer_deal(&s, &buyer_id);
    let buyer_deal = s.client.get_deal(&buyer_id);
    assert!(buyer_deal.buyer_terms_accepted);
    assert!(!buyer_deal.seller_terms_accepted);

    let seller_id = id(&s.env, 2);
    create_seller_deal(&s, &seller_id);
    let seller_deal = s.client.get_deal(&seller_id);
    assert!(!seller_deal.buyer_terms_accepted);
    assert!(seller_deal.seller_terms_accepted);
}

#[test]
fn create_deal_rejects_invalid_inputs() {
    let s = setup();
    let deal_id = id(&s.env, 3);
    expect_error(
        s.client.try_create_deal(
            &deal_id,
            &s.other,
            &s.buyer,
            &s.seller,
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
            &id(&s.env, 31),
            &s.buyer,
            &s.buyer,
            &s.seller,
            &id(&s.env, 99),
            &PRINCIPAL,
            &-1,
            &SELLER_BOND,
            &2_000,
            &3_000,
            &4_000,
        ),
        ContractError::InvalidAmount,
    );
    expect_error(
        s.client.try_create_deal(
            &id(&s.env, 6),
            &s.buyer,
            &s.buyer,
            &s.seller,
            &id(&s.env, 99),
            &PRINCIPAL,
            &BUYER_BOND,
            &SELLER_BOND,
            &999,
            &3_000,
            &4_000,
        ),
        ContractError::InvalidDeadline,
    );
}

#[test]
fn buyer_obligation_overflow_fails_before_token_transfer() {
    let s = setup();
    let deal_id = id(&s.env, 32);
    s.client.create_deal(
        &deal_id,
        &s.buyer,
        &s.buyer,
        &s.seller,
        &id(&s.env, 99),
        &i128::MAX,
        &1,
        &SELLER_BOND,
        &2_000,
        &3_000,
        &4_000,
    );
    s.client.accept_terms(&deal_id, &s.seller);
    let before = s.token.balance(&s.contract_id);
    expect_error(
        s.client.try_fund_buyer(&deal_id, &s.buyer),
        ContractError::AmountOverflow,
    );
    assert_eq!(s.token.balance(&s.contract_id), before);
    assert!(!s.client.get_deal(&deal_id).buyer_funded);
}

#[test]
fn duplicate_deal_id_fails() {
    let s = setup();
    let deal_id = id(&s.env, 7);
    create_buyer_deal(&s, &deal_id);
    expect_error(
        s.client.try_create_deal(
            &deal_id,
            &s.buyer,
            &s.buyer,
            &s.seller,
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
fn accept_terms_moves_to_awaiting_funding_and_rejects_unrelated_or_duplicate() {
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
fn funding_before_both_accept_fails() {
    let s = setup();
    let deal_id = id(&s.env, 9);
    create_buyer_deal(&s, &deal_id);
    expect_error(
        s.client.try_fund_buyer(&deal_id, &s.buyer),
        ContractError::InvalidState,
    );
}

#[test]
fn buyer_first_funding_locks_exact_amounts_after_seller_funds() {
    let s = setup();
    let deal_id = id(&s.env, 10);
    accepted_deal(&s, &deal_id);
    let buyer_start = s.token.balance(&s.buyer);
    let seller_start = s.token.balance(&s.seller);

    s.client.fund_buyer(&deal_id, &s.buyer);
    assert_eq!(
        s.token.balance(&s.buyer),
        buyer_start - PRINCIPAL - BUYER_BOND
    );
    assert_eq!(s.token.balance(&s.contract_id), PRINCIPAL + BUYER_BOND);
    assert_eq!(s.client.get_state(&deal_id), DealState::AwaitingFunding);

    s.client.fund_seller(&deal_id, &s.seller);
    assert_eq!(s.token.balance(&s.seller), seller_start - SELLER_BOND);
    assert_eq!(
        s.token.balance(&s.contract_id),
        PRINCIPAL + BUYER_BOND + SELLER_BOND
    );
    assert_eq!(s.client.get_state(&deal_id), DealState::Active);
}

#[test]
fn seller_first_funding_locks_after_buyer_funds() {
    let s = setup();
    let deal_id = id(&s.env, 11);
    accepted_deal(&s, &deal_id);
    s.client.fund_seller(&deal_id, &s.seller);
    assert_eq!(s.client.get_state(&deal_id), DealState::AwaitingFunding);
    s.client.fund_buyer(&deal_id, &s.buyer);
    assert_eq!(s.client.get_state(&deal_id), DealState::Active);
}

#[test]
fn duplicate_wrong_caller_late_and_insufficient_funding_fail_atomically() {
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

    let late_id = id(&s.env, 13);
    accepted_deal(&s, &late_id);
    s.env.ledger().set_timestamp(2_000);
    expect_error(
        s.client.try_fund_seller(&late_id, &s.seller),
        ContractError::FundingDeadlinePassed,
    );

    let poor = Address::generate(&s.env);
    let poor_seller = Address::generate(&s.env);
    let poor_id = id(&s.env, 14);
    s.token_admin.mint(&poor_seller, &SELLER_BOND);
    s.env.ledger().set_timestamp(1_000);
    s.client.create_deal(
        &poor_id,
        &poor,
        &poor,
        &poor_seller,
        &id(&s.env, 99),
        &PRINCIPAL,
        &BUYER_BOND,
        &SELLER_BOND,
        &2_000,
        &3_000,
        &4_000,
    );
    s.client.accept_terms(&poor_id, &poor_seller);
    let before = s.token.balance(&s.contract_id);
    let _ = s.client.try_fund_buyer(&poor_id, &poor).unwrap_err();
    assert_eq!(s.token.balance(&s.contract_id), before);
    assert!(!s.client.get_deal(&poor_id).buyer_funded);
}

#[test]
fn funding_auth_tree_contains_participant_and_token_transfer() {
    let s = setup();
    let deal_id = id(&s.env, 15);
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
fn expiry_before_deadline_fails_and_after_deadline_refunds_buyer_only() {
    let s = setup();
    let deal_id = id(&s.env, 16);
    accepted_deal(&s, &deal_id);
    let buyer_start = s.token.balance(&s.buyer);
    s.client.fund_buyer(&deal_id, &s.buyer);
    expect_error(
        s.client.try_expire_funding(&deal_id),
        ContractError::FundingDeadlineOpen,
    );
    s.env.ledger().set_timestamp(2_001);
    s.client.expire_funding(&deal_id);
    assert_eq!(s.token.balance(&s.buyer), buyer_start);
    assert_eq!(s.client.get_state(&deal_id), DealState::FundingExpired);
    expect_error(
        s.client.try_expire_funding(&deal_id),
        ContractError::TerminalState,
    );
}

#[test]
fn expiry_refunds_seller_only_and_closes_neither_funded_without_transfer() {
    let s = setup();
    let seller_id = id(&s.env, 17);
    accepted_deal(&s, &seller_id);
    let seller_start = s.token.balance(&s.seller);
    s.client.fund_seller(&seller_id, &s.seller);
    s.env.ledger().set_timestamp(2_001);
    s.client.expire_funding(&seller_id);
    assert_eq!(s.token.balance(&s.seller), seller_start);

    let none_id = id(&s.env, 18);
    s.env.ledger().set_timestamp(1_000);
    accepted_deal(&s, &none_id);
    let contract_balance = s.token.balance(&s.contract_id);
    s.env.ledger().set_timestamp(2_001);
    s.client.expire_funding(&none_id);
    assert_eq!(s.token.balance(&s.contract_id), contract_balance);
    assert_eq!(s.client.get_state(&none_id), DealState::FundingExpired);
}

#[test]
fn expiry_after_both_funded_is_impossible() {
    let s = setup();
    let deal_id = id(&s.env, 19);
    active_deal(&s, &deal_id);
    s.env.ledger().set_timestamp(2_001);
    expect_error(
        s.client.try_expire_funding(&deal_id),
        ContractError::InvalidState,
    );
}

#[test]
fn evidence_only_seller_only_active_and_immutable() {
    let s = setup();
    let deal_id = id(&s.env, 20);
    accepted_deal(&s, &deal_id);
    expect_error(
        s.client
            .try_submit_evidence(&deal_id, &s.seller, &id(&s.env, 77)),
        ContractError::InvalidState,
    );
    s.client.fund_buyer(&deal_id, &s.buyer);
    s.client.fund_seller(&deal_id, &s.seller);
    expect_error(
        s.client
            .try_submit_evidence(&deal_id, &s.buyer, &id(&s.env, 77)),
        ContractError::UnauthorizedParticipant,
    );
    s.client
        .submit_evidence(&deal_id, &s.seller, &id(&s.env, 77));
    assert_eq!(
        s.client.get_deal(&deal_id).evidence_commitment,
        Some(id(&s.env, 77))
    );
    expect_error(
        s.client
            .try_submit_evidence(&deal_id, &s.seller, &id(&s.env, 78)),
        ContractError::InvalidState,
    );
}

#[test]
fn success_settlement_distributes_exact_amounts_and_is_terminal() {
    let s = setup();
    let deal_id = id(&s.env, 21);
    evidence_deal(&s, &deal_id);
    let buyer_after_funding = s.token.balance(&s.buyer);
    let seller_after_funding = s.token.balance(&s.seller);

    s.client.accept_delivery(&deal_id, &s.buyer);

    assert_eq!(s.token.balance(&s.buyer), buyer_after_funding + BUYER_BOND);
    assert_eq!(
        s.token.balance(&s.seller),
        seller_after_funding + PRINCIPAL + SELLER_BOND
    );
    assert_eq!(s.token.balance(&s.contract_id), 0);
    assert_eq!(s.client.get_state(&deal_id), DealState::SettledSuccess);
    expect_error(
        s.client.try_accept_delivery(&deal_id, &s.buyer),
        ContractError::TerminalState,
    );
}

#[test]
fn only_buyer_can_accept_delivery_and_not_before_evidence() {
    let s = setup();
    let deal_id = id(&s.env, 22);
    active_deal(&s, &deal_id);
    expect_error(
        s.client.try_accept_delivery(&deal_id, &s.buyer),
        ContractError::InvalidState,
    );
    s.client
        .submit_evidence(&deal_id, &s.seller, &id(&s.env, 77));
    expect_error(
        s.client.try_accept_delivery(&deal_id, &s.seller),
        ContractError::UnauthorizedParticipant,
    );
}

#[test]
fn post_terminal_operations_reject() {
    let s = setup();
    let deal_id = id(&s.env, 23);
    evidence_deal(&s, &deal_id);
    s.client.accept_delivery(&deal_id, &s.buyer);
    expect_error(
        s.client.try_fund_seller(&deal_id, &s.seller),
        ContractError::TerminalState,
    );
    expect_error(
        s.client
            .try_submit_evidence(&deal_id, &s.seller, &id(&s.env, 88)),
        ContractError::TerminalState,
    );
}

#[test]
fn read_functions_return_contract_facts_only() {
    let s = setup();
    let deal_id = id(&s.env, 24);
    assert!(!s.client.deal_exists(&deal_id));
    create_buyer_deal(&s, &deal_id);
    assert!(s.client.deal_exists(&deal_id));
    let info = s.client.contract_info();
    assert_eq!(info.interface_version, POLICY_INTERFACE_VERSION);
    assert_eq!(info.policy_version, 1);
}

#[test]
fn events_are_emitted_for_material_actions_without_terms_document() {
    let s = setup();
    last_events_contain(&s, "init");
    let deal_id = id(&s.env, 25);
    create_buyer_deal(&s, &deal_id);
    last_events_contain(&s, "deal");
    s.client.accept_terms(&deal_id, &s.seller);
    last_events_contain(&s, "accept");
    last_events_contain(&s, "state");
    s.client.fund_buyer(&deal_id, &s.buyer);
    last_events_contain(&s, "bfund");
    s.client.fund_seller(&deal_id, &s.seller);
    last_events_contain(&s, "sfund");
    last_events_contain(&s, "active");
    s.client
        .submit_evidence(&deal_id, &s.seller, &id(&s.env, 77));
    last_events_contain(&s, "evidence");
    s.client.accept_delivery(&deal_id, &s.buyer);
    last_events_contain(&s, "settled");
}

#[test]
fn storage_ttl_is_extended_for_instance_and_deal() {
    use soroban_sdk::testutils::storage::{Instance, Persistent};

    let s = setup();
    let deal_id = id(&s.env, 26);
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

#[test]
fn aggregate_accounting_with_open_and_terminal_deals_is_exact() {
    let s = setup();
    let open_id = id(&s.env, 27);
    active_deal(&s, &open_id);

    let settle_id = id(&s.env, 28);
    evidence_deal(&s, &settle_id);
    s.client.accept_delivery(&settle_id, &s.buyer);

    let expire_id = id(&s.env, 29);
    accepted_deal(&s, &expire_id);
    s.client.fund_buyer(&expire_id, &s.buyer);
    s.env.ledger().set_timestamp(2_001);
    s.client.expire_funding(&expire_id);

    assert_eq!(
        s.token.balance(&s.contract_id),
        PRINCIPAL + BUYER_BOND + SELLER_BOND
    );
}

#[test]
fn legal_state_sequence_and_illegal_transitions_are_enforced() {
    let s = setup();
    let deal_id = id(&s.env, 30);
    create_buyer_deal(&s, &deal_id);
    assert_eq!(s.client.get_state(&deal_id), DealState::TermsPending);
    s.client.accept_terms(&deal_id, &s.seller);
    assert_eq!(s.client.get_state(&deal_id), DealState::AwaitingFunding);
    s.client.fund_buyer(&deal_id, &s.buyer);
    expect_error(
        s.client
            .try_submit_evidence(&deal_id, &s.seller, &id(&s.env, 77)),
        ContractError::InvalidState,
    );
    s.client.fund_seller(&deal_id, &s.seller);
    assert_eq!(s.client.get_state(&deal_id), DealState::Active);
    s.client
        .submit_evidence(&deal_id, &s.seller, &id(&s.env, 77));
    assert_eq!(s.client.get_state(&deal_id), DealState::EvidenceSubmitted);
    s.client.accept_delivery(&deal_id, &s.buyer);
    assert_eq!(s.client.get_state(&deal_id), DealState::SettledSuccess);
}
