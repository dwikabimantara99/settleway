#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, BytesN, Env, IntoVal};

fn setup() -> (
    Env,
    SettlewayEscrowContractClient<'static>,
    Address,
    Address,
    Address,
    u64,
) {
    let env = Env::default();
    let contract_id = env.register(SettlewayEscrowContract, ());
    let client = SettlewayEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let deal_hash = BytesN::from_array(&env, &[0; 32]);
    let expires_at = 100_000;

    env.ledger().set_timestamp(10_000);

    let escrow_id = client.create_escrow(
        &deal_hash,
        &buyer,
        &seller,
        &1_000_000,
        &50_000,
        &50_000,
        &5_000,
        &5_000,
        &expires_at,
    );

    (env, client, admin, buyer, seller, escrow_id)
}

#[test]
fn test_buyer_first_seller_second_locks() {
    let (_env, client, _, buyer, seller, escrow_id) = setup();

    client.deposit_buyer(&escrow_id, &buyer);
    assert_eq!(
        client.get_escrow(&escrow_id).status,
        EscrowStatus::BuyerFunded
    );

    client.deposit_seller(&escrow_id, &seller);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Locked);
}

#[test]
fn test_seller_first_buyer_second_locks() {
    let (_env, client, _, buyer, seller, escrow_id) = setup();

    client.deposit_seller(&escrow_id, &seller);
    assert_eq!(
        client.get_escrow(&escrow_id).status,
        EscrowStatus::SellerFunded
    );

    client.deposit_buyer(&escrow_id, &buyer);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Locked);
}

#[test]
fn test_expiry_no_deposit_becomes_expired() {
    let (env, client, _admin, _, _, escrow_id) = setup();
    env.ledger().set_timestamp(100_001); // Past expires_at
    client.expire_if_unfunded(&escrow_id);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Expired);
}

#[test]
fn test_expiry_buyer_funded_becomes_refunded() {
    let (env, client, _admin, buyer, _, escrow_id) = setup();
    client.deposit_buyer(&escrow_id, &buyer);
    env.ledger().set_timestamp(100_001); // Past expires_at
    client.expire_if_unfunded(&escrow_id);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Refunded);
}

#[test]
fn test_expiry_seller_funded_becomes_refunded() {
    let (env, client, _admin, _, seller, escrow_id) = setup();
    client.deposit_seller(&escrow_id, &seller);
    env.ledger().set_timestamp(100_001); // Past expires_at
    client.expire_if_unfunded(&escrow_id);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Refunded);
}

#[test]
#[should_panic(expected = "Cannot expire after lock")]
fn test_expiry_after_locked_rejected() {
    let (env, client, _admin, buyer, seller, escrow_id) = setup();
    client.deposit_buyer(&escrow_id, &buyer);
    client.deposit_seller(&escrow_id, &seller);
    env.ledger().set_timestamp(100_001); // Past expires_at
    client.expire_if_unfunded(&escrow_id);
}

#[test]
#[should_panic(expected = "Not expired yet")]
fn test_expiry_before_time_rejected() {
    let (env, client, _admin, _, _, escrow_id) = setup();
    env.ledger().set_timestamp(99_999); // Before expires_at
    client.expire_if_unfunded(&escrow_id);
}

#[test]
#[should_panic]
fn test_expiry_auth_required() {
    let env = Env::default();
    let contract_id = env.register(SettlewayEscrowContract, ());
    let client = SettlewayEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let malicious = Address::generate(&env);

    // Explicitly mock all auths for setup
    env.mock_all_auths();

    client.initialize(&admin);

    let deal_hash = BytesN::from_array(&env, &[0; 32]);
    let escrow_id = client.create_escrow(
        &deal_hash, &buyer, &seller, &100, &10, &10, &1, &1, &100_000,
    );

    env.ledger().set_timestamp(100_001);

    // Attempt to expire with malicious auth. The contract requires admin auth, so this will panic.
    client
        .mock_auths(&[MockAuth {
            address: &malicious,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "expire_if_unfunded",
                args: (&escrow_id,).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .expire_if_unfunded(&escrow_id);
}

#[test]
#[should_panic(expected = "No funds to refund")]
fn test_refund_no_deposit_rejected() {
    let (_env, client, _admin, _, _, escrow_id) = setup();
    client.refund_before_locked(&escrow_id);
}

#[test]
fn test_refund_buyer_funded_becomes_refunded() {
    let (_env, client, _admin, buyer, _, escrow_id) = setup();
    client.deposit_buyer(&escrow_id, &buyer);
    client.refund_before_locked(&escrow_id);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Refunded);
}

#[test]
fn test_refund_seller_funded_becomes_refunded() {
    let (_env, client, _admin, _, seller, escrow_id) = setup();
    client.deposit_seller(&escrow_id, &seller);
    client.refund_before_locked(&escrow_id);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Refunded);
}

#[test]
#[should_panic(expected = "Cannot refund after locked")]
fn test_refund_after_locked_rejected() {
    let (_env, client, _admin, buyer, seller, escrow_id) = setup();
    client.deposit_buyer(&escrow_id, &buyer);
    client.deposit_seller(&escrow_id, &seller);
    client.refund_before_locked(&escrow_id);
}

#[test]
#[should_panic]
fn test_refund_auth_required() {
    let env = Env::default();
    let contract_id = env.register(SettlewayEscrowContract, ());
    let client = SettlewayEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let malicious = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);
    let deal_hash = BytesN::from_array(&env, &[0; 32]);
    let escrow_id = client.create_escrow(
        &deal_hash, &buyer, &seller, &100, &10, &10, &1, &1, &100_000,
    );
    client.deposit_buyer(&escrow_id, &buyer);

    client
        .mock_auths(&[MockAuth {
            address: &malicious,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "refund_before_locked",
                args: (&escrow_id,).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .refund_before_locked(&escrow_id);
}

#[test]
#[should_panic(expected = "Invalid state for acceptance")]
fn test_completion_from_proof_submitted_rejected() {
    let (env, client, _admin, buyer, seller, escrow_id) = setup();
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    client.deposit_buyer(&escrow_id, &buyer);
    client.deposit_seller(&escrow_id, &seller);
    client.submit_proof_hash(&escrow_id, &seller, &proof_hash);

    client.accept_and_complete(&escrow_id, &buyer);
}

#[test]
fn test_completion_from_delivered_produces_completed() {
    let (env, client, _admin, buyer, seller, escrow_id) = setup();
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    client.deposit_buyer(&escrow_id, &buyer);
    client.deposit_seller(&escrow_id, &seller);
    client.submit_proof_hash(&escrow_id, &seller, &proof_hash);
    client.mark_delivered(&escrow_id, &seller);

    client.accept_and_complete(&escrow_id, &buyer);
    assert_eq!(
        client.get_escrow(&escrow_id).status,
        EscrowStatus::Completed
    );
}
