#![cfg(test)]

use super::*;
use soroban_sdk::{Env, testutils::Address as _, BytesN, Address};

#[test]
fn test_escrow_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SettlewayEscrowContract);
    let client = SettlewayEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let deal_hash = BytesN::from_array(&env, &[0; 32]);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    let escrow_id = client.create_escrow(
        &deal_hash,
        &buyer,
        &seller,
        &1_000_000,
        &50_000,
        &50_000,
        &5_000,
        &5_000,
        &9_999_999,
    );

    assert_eq!(escrow_id, 1);
    
    let mut escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::WaitingDeposits);

    client.deposit_buyer(&escrow_id, &buyer);
    escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::BuyerFunded);

    client.deposit_seller(&escrow_id, &seller);
    escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Locked);

    client.submit_proof_hash(&escrow_id, &seller, &proof_hash);
    escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::ProofSubmitted);

    client.mark_delivered(&escrow_id, &seller);
    escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Delivered);

    client.accept_and_complete(&escrow_id, &buyer);
    escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Completed);
}

#[test]
#[should_panic(expected = "Invalid state")]
fn test_invalid_proof() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SettlewayEscrowContract);
    let client = SettlewayEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let deal_hash = BytesN::from_array(&env, &[0; 32]);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    let escrow_id = client.create_escrow(
        &deal_hash,
        &buyer,
        &seller,
        &1_000_000,
        &50_000,
        &50_000,
        &5_000,
        &5_000,
        &9_999_999,
    );

    // Try submitting proof before locked
    client.submit_proof_hash(&escrow_id, &seller, &proof_hash);
}
