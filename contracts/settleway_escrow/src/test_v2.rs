#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, BytesN, Env, IntoVal};
use soroban_sdk::token::{StellarAssetClient, Client as TokenClient};

fn setup_v2() -> (
    Env,
    SettlewayEscrowContractClient<'static>,
    Address,
    Address,
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
    let fee_recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);
    // Register token contract
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_admin_client = StellarAssetClient::new(&env, &token_address);

    env.mock_all_auths();

    client.initialize(&admin);

    // Mint tokens to buyer and seller
    token_admin_client.mint(&buyer, &2_000_000);
    token_admin_client.mint(&seller, &1_000_000);

    let deal_hash = BytesN::from_array(&env, &[0; 32]);
    let expires_at = 100_000;

    env.ledger().set_timestamp(10_000);

    let principal = 1_000_000;
    let buyer_bond = 50_000;
    let seller_bond = 50_000;
    let buyer_fee = 5_000;
    let seller_fee = 5_000;

    let escrow_id = client.create_escrow_v2(
        &deal_hash,
        &token_address,
        &fee_recipient,
        &buyer,
        &seller,
        &principal,
        &buyer_bond,
        &seller_bond,
        &buyer_fee,
        &seller_fee,
        &expires_at,
    );

    (env, client, token_address, buyer, seller, fee_recipient, token_admin, escrow_id)
}

#[test]
fn test_v2_funding_and_settlement_success() {
    let (env, client, token_address, buyer, seller, fee_recipient, _, escrow_id) = setup_v2();
    let token_client = TokenClient::new(&env, &token_address);

    let contract_address = client.address.clone();

    // 1. Buyer deposit
    client.deposit_buyer_v2(&escrow_id, &buyer);
    assert_eq!(client.get_custody_escrow(&escrow_id).status, EscrowStatus::BuyerFunded);
    assert_eq!(token_client.balance(&contract_address), 1_000_000 + 50_000 + 5_000);

    // 2. Seller deposit
    client.deposit_seller_v2(&escrow_id, &seller);
    assert_eq!(client.get_custody_escrow(&escrow_id).status, EscrowStatus::Locked);
    assert_eq!(token_client.balance(&contract_address), 1_000_000 + 50_000 + 5_000 + 50_000 + 5_000);

    // 3. Mark delivered
    let proof_hash = BytesN::from_array(&env, &[1; 32]);
    client.submit_proof_hash_v2(&escrow_id, &seller, &proof_hash);
    client.mark_delivered_v2(&escrow_id, &seller);
    assert_eq!(client.get_custody_escrow(&escrow_id).status, EscrowStatus::Delivered);

    // Balances before settlement
    let buyer_balance_before = token_client.balance(&buyer);
    let seller_balance_before = token_client.balance(&seller);
    let fee_balance_before = token_client.balance(&fee_recipient);

    // 4. Accept and complete (Settlement)
    client.settle_and_complete(&escrow_id, &buyer);
    assert_eq!(client.get_custody_escrow(&escrow_id).status, EscrowStatus::Completed);

    // Contract should be empty
    assert_eq!(token_client.balance(&contract_address), 0);

    // Balances after settlement
    assert_eq!(token_client.balance(&buyer), buyer_balance_before + 50_000); // Buyer gets buyer_bond back
    assert_eq!(token_client.balance(&seller), seller_balance_before + 1_000_000 + 50_000); // Seller gets principal + seller_bond back
    assert_eq!(token_client.balance(&fee_recipient), fee_balance_before + 10_000); // Admin gets 5000 + 5000
}

#[test]
#[should_panic(expected = "Not the buyer")]
fn test_v2_unauthorized_settlement_rejected() {
    let (env, client, _, buyer, seller, _, _, escrow_id) = setup_v2();
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    client.deposit_buyer_v2(&escrow_id, &buyer);
    client.deposit_seller_v2(&escrow_id, &seller);
    client.submit_proof_hash_v2(&escrow_id, &seller, &proof_hash);
    client.mark_delivered_v2(&escrow_id, &seller);

    // Seller tries to accept (unauthorized, only buyer can accept)
    client.settle_and_complete(&escrow_id, &seller);
}

#[test]
#[should_panic(expected = "Invalid state for acceptance")]
fn test_v2_double_settlement_rejected() {
    let (env, client, _, buyer, seller, _, _, escrow_id) = setup_v2();
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    client.deposit_buyer_v2(&escrow_id, &buyer);
    client.deposit_seller_v2(&escrow_id, &seller);
    client.submit_proof_hash_v2(&escrow_id, &seller, &proof_hash);
    client.mark_delivered_v2(&escrow_id, &seller);

    client.settle_and_complete(&escrow_id, &buyer);
    // Double settlement
    client.settle_and_complete(&escrow_id, &buyer);
}
