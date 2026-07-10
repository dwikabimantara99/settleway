#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env, Symbol,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Created = 0,
    WaitingDeposits = 1,
    BuyerFunded = 2,
    SellerFunded = 3,
    Locked = 4,
    ProofSubmitted = 5,
    Delivered = 6,
    Accepted = 7,
    Completed = 8,
    Expired = 9,
    Refunded = 10,
    Cancelled = 11,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub id: u64,
    pub deal_hash: BytesN<32>,
    pub buyer: Address,
    pub seller: Address,
    pub principal: i128,
    pub buyer_bond: i128,
    pub seller_bond: i128,
    pub buyer_fee: i128,
    pub seller_fee: i128,
    pub status: EscrowStatus,
    pub proof_hash: Option<BytesN<32>>,
    pub expires_at: u64,
}

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const ESCROW_COUNTER_KEY: Symbol = symbol_short!("COUNTER");

#[contracttype]
pub enum DataKey {
    Escrow(u64),
    CustodyEscrow(u64),
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CustodyEscrow {
    pub id: u64,
    pub deal_hash: BytesN<32>,
    pub token: Address,
    pub fee_recipient: Address,
    pub buyer: Address,
    pub seller: Address,
    pub principal_token_amount: i128,
    pub buyer_bond_token_amount: i128,
    pub seller_bond_token_amount: i128,
    pub buyer_fee_token_amount: i128,
    pub seller_fee_token_amount: i128,
    pub status: EscrowStatus,
    pub proof_hash: Option<BytesN<32>>,
    pub expires_at: u64,
}

#[contract]
pub struct SettlewayEscrowContract;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl SettlewayEscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&ESCROW_COUNTER_KEY, &0u64);
    }

    // The contract ABI is intentionally explicit so off-chain proof tooling can
    // preserve each settlement field without introducing a new serialized shape.
    #[allow(clippy::too_many_arguments, deprecated)]
    pub fn create_escrow(
        env: Env,
        deal_hash: BytesN<32>,
        buyer: Address,
        seller: Address,
        principal: i128,
        buyer_bond: i128,
        seller_bond: i128,
        buyer_fee: i128,
        seller_fee: i128,
        expires_at: u64,
    ) -> u64 {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Not initialized");
        admin.require_auth();

        let mut counter: u64 = env.storage().instance().get(&ESCROW_COUNTER_KEY).unwrap();
        counter += 1;

        let escrow = Escrow {
            id: counter,
            deal_hash: deal_hash.clone(),
            buyer: buyer.clone(),
            seller: seller.clone(),
            principal,
            buyer_bond,
            seller_bond,
            buyer_fee,
            seller_fee,
            status: EscrowStatus::WaitingDeposits,
            proof_hash: None,
            expires_at,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(counter), &escrow);
        env.storage().instance().set(&ESCROW_COUNTER_KEY, &counter);

        env.events().publish(
            (Symbol::new(&env, "EscrowCreated"), counter),
            (deal_hash, buyer, seller, principal),
        );

        counter
    }

    #[allow(deprecated)]
    pub fn deposit_buyer(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if escrow.buyer != actor {
            panic!("Not the buyer");
        }

        match escrow.status {
            EscrowStatus::WaitingDeposits => escrow.status = EscrowStatus::BuyerFunded,
            EscrowStatus::SellerFunded => escrow.status = EscrowStatus::Locked,
            _ => panic!("Invalid state for buyer deposit"),
        }

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        env.events()
            .publish((Symbol::new(&env, "BuyerDeposited"), escrow_id), actor);

        if escrow.status == EscrowStatus::Locked {
            env.events()
                .publish((Symbol::new(&env, "EscrowLocked"), escrow_id), ());
        }
    }

    #[allow(deprecated)]
    pub fn deposit_seller(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if escrow.seller != actor {
            panic!("Not the seller");
        }

        match escrow.status {
            EscrowStatus::WaitingDeposits => escrow.status = EscrowStatus::SellerFunded,
            EscrowStatus::BuyerFunded => escrow.status = EscrowStatus::Locked,
            _ => panic!("Invalid state for seller deposit"),
        }

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        env.events()
            .publish((Symbol::new(&env, "SellerDeposited"), escrow_id), actor);

        if escrow.status == EscrowStatus::Locked {
            env.events()
                .publish((Symbol::new(&env, "EscrowLocked"), escrow_id), ());
        }
    }

    #[allow(deprecated)]
    pub fn submit_proof_hash(env: Env, escrow_id: u64, actor: Address, proof_hash: BytesN<32>) {
        actor.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if escrow.seller != actor {
            panic!("Not the seller");
        }
        if escrow.status != EscrowStatus::Locked {
            panic!("Invalid state for proof");
        }

        escrow.status = EscrowStatus::ProofSubmitted;
        escrow.proof_hash = Some(proof_hash.clone());

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        env.events()
            .publish((Symbol::new(&env, "ProofSubmitted"), escrow_id), proof_hash);
    }

    #[allow(deprecated)]
    pub fn mark_delivered(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if escrow.seller != actor {
            panic!("Not the seller");
        }
        if escrow.status != EscrowStatus::ProofSubmitted {
            panic!("Invalid state for delivery");
        }

        escrow.status = EscrowStatus::Delivered;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        env.events()
            .publish((Symbol::new(&env, "DeliveryMarked"), escrow_id), ());
    }

    #[allow(deprecated)]
    pub fn accept_and_complete(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if escrow.buyer != actor {
            panic!("Not the buyer");
        }
        if escrow.status != EscrowStatus::Delivered {
            panic!("Invalid state for acceptance");
        }

        escrow.status = EscrowStatus::Completed;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        env.events()
            .publish((Symbol::new(&env, "EscrowCompleted"), escrow_id), ());
    }

    #[allow(deprecated)]
    pub fn expire_if_unfunded(env: Env, escrow_id: u64) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Not initialized");
        admin.require_auth();

        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if env.ledger().timestamp() < escrow.expires_at {
            panic!("Not expired yet");
        }
        match escrow.status {
            EscrowStatus::WaitingDeposits => {
                escrow.status = EscrowStatus::Expired;
                env.storage()
                    .persistent()
                    .set(&DataKey::Escrow(escrow_id), &escrow);
                env.events()
                    .publish((Symbol::new(&env, "EscrowExpired"), escrow_id), ());
            }
            EscrowStatus::BuyerFunded | EscrowStatus::SellerFunded => {
                escrow.status = EscrowStatus::Refunded;
                env.storage()
                    .persistent()
                    .set(&DataKey::Escrow(escrow_id), &escrow);
                env.events()
                    .publish((Symbol::new(&env, "EscrowRefunded"), escrow_id), ());
            }
            _ => panic!("Cannot expire after lock"),
        }
    }

    #[allow(deprecated)]
    pub fn refund_before_locked(env: Env, escrow_id: u64) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Not initialized");
        admin.require_auth();

        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);

        match escrow.status {
            EscrowStatus::BuyerFunded | EscrowStatus::SellerFunded => {
                escrow.status = EscrowStatus::Refunded;
                env.storage()
                    .persistent()
                    .set(&DataKey::Escrow(escrow_id), &escrow);
                env.events()
                    .publish((Symbol::new(&env, "EscrowRefunded"), escrow_id), ());
            }
            EscrowStatus::WaitingDeposits => panic!("No funds to refund"),
            _ => panic!("Cannot refund after locked"),
        }
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .expect("Escrow not found")
    }

    // --- V2: Real Token Custody and Settlement --- //

    #[allow(clippy::too_many_arguments)]
    pub fn create_escrow_v2(
        env: Env,
        deal_hash: BytesN<32>,
        token: Address,
        fee_recipient: Address,
        buyer: Address,
        seller: Address,
        principal_token_amount: i128,
        buyer_bond_token_amount: i128,
        seller_bond_token_amount: i128,
        buyer_fee_token_amount: i128,
        seller_fee_token_amount: i128,
        expires_at: u64,
    ) -> u64 {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).expect("Not initialized");
        admin.require_auth();

        let mut counter: u64 = env.storage().instance().get(&ESCROW_COUNTER_KEY).unwrap();
        counter += 1;

        let escrow = CustodyEscrow {
            id: counter,
            deal_hash: deal_hash.clone(),
            token: token.clone(),
            fee_recipient: fee_recipient.clone(),
            buyer: buyer.clone(),
            seller: seller.clone(),
            principal_token_amount,
            buyer_bond_token_amount,
            seller_bond_token_amount,
            buyer_fee_token_amount,
            seller_fee_token_amount,
            status: EscrowStatus::WaitingDeposits,
            proof_hash: None,
            expires_at,
        };

        env.storage().persistent().set(&DataKey::CustodyEscrow(counter), &escrow);
        env.storage().instance().set(&ESCROW_COUNTER_KEY, &counter);

        env.events().publish(
            (Symbol::new(&env, "EscrowCreatedV2"), counter),
            (deal_hash, token, buyer, seller, principal_token_amount),
        );

        counter
    }

    pub fn deposit_buyer_v2(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow = Self::get_custody_escrow(env.clone(), escrow_id);
        if escrow.buyer != actor {
            panic!("Not the buyer");
        }

        match escrow.status {
            EscrowStatus::WaitingDeposits => escrow.status = EscrowStatus::BuyerFunded,
            EscrowStatus::SellerFunded => escrow.status = EscrowStatus::Locked,
            _ => panic!("Invalid state for buyer deposit"),
        }

        // Transfer tokens to contract
        let amount = escrow.principal_token_amount + escrow.buyer_bond_token_amount + escrow.buyer_fee_token_amount;
        if amount > 0 {
            let client = token::Client::new(&env, &escrow.token);
            client.transfer(&actor, &env.current_contract_address(), &amount);
        }

        env.storage().persistent().set(&DataKey::CustodyEscrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "BuyerDepositedV2"), escrow_id), actor);

        if escrow.status == EscrowStatus::Locked {
            env.events().publish((Symbol::new(&env, "EscrowLockedV2"), escrow_id), ());
        }
    }

    pub fn deposit_seller_v2(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow = Self::get_custody_escrow(env.clone(), escrow_id);
        if escrow.seller != actor {
            panic!("Not the seller");
        }

        match escrow.status {
            EscrowStatus::WaitingDeposits => escrow.status = EscrowStatus::SellerFunded,
            EscrowStatus::BuyerFunded => escrow.status = EscrowStatus::Locked,
            _ => panic!("Invalid state for seller deposit"),
        }

        // Transfer tokens to contract
        let amount = escrow.seller_bond_token_amount + escrow.seller_fee_token_amount;
        if amount > 0 {
            let client = token::Client::new(&env, &escrow.token);
            client.transfer(&actor, &env.current_contract_address(), &amount);
        }

        env.storage().persistent().set(&DataKey::CustodyEscrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "SellerDepositedV2"), escrow_id), actor);

        if escrow.status == EscrowStatus::Locked {
            env.events().publish((Symbol::new(&env, "EscrowLockedV2"), escrow_id), ());
        }
    }

    pub fn submit_proof_hash_v2(env: Env, escrow_id: u64, actor: Address, proof_hash: BytesN<32>) {
        actor.require_auth();
        let mut escrow = Self::get_custody_escrow(env.clone(), escrow_id);
        if escrow.seller != actor {
            panic!("Not the seller");
        }
        if escrow.status != EscrowStatus::Locked {
            panic!("Invalid state for proof");
        }

        escrow.status = EscrowStatus::ProofSubmitted;
        escrow.proof_hash = Some(proof_hash.clone());

        env.storage().persistent().set(&DataKey::CustodyEscrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "ProofSubmittedV2"), escrow_id), proof_hash);
    }

    pub fn mark_delivered_v2(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow = Self::get_custody_escrow(env.clone(), escrow_id);
        if escrow.seller != actor {
            panic!("Not the seller");
        }
        if escrow.status != EscrowStatus::ProofSubmitted {
            panic!("Invalid state for delivery");
        }

        escrow.status = EscrowStatus::Delivered;
        env.storage().persistent().set(&DataKey::CustodyEscrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "DeliveryMarkedV2"), escrow_id), ());
    }

    pub fn settle_and_complete(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow = Self::get_custody_escrow(env.clone(), escrow_id);
        if escrow.buyer != actor {
            panic!("Not the buyer");
        }
        if escrow.status != EscrowStatus::Delivered {
            panic!("Invalid state for acceptance");
        }

        escrow.status = EscrowStatus::Completed;

        // Perform settlement transfers
        let client = token::Client::new(&env, &escrow.token);
        
        // 1. Principal to seller
        if escrow.principal_token_amount > 0 {
            client.transfer(&env.current_contract_address(), &escrow.seller, &escrow.principal_token_amount);
        }
        
        // 2. Buyer bond refund to buyer
        if escrow.buyer_bond_token_amount > 0 {
            client.transfer(&env.current_contract_address(), &escrow.buyer, &escrow.buyer_bond_token_amount);
        }
        
        // 3. Seller bond refund to seller
        if escrow.seller_bond_token_amount > 0 {
            client.transfer(&env.current_contract_address(), &escrow.seller, &escrow.seller_bond_token_amount);
        }
        
        // 4. Fees to fee recipient
        let total_fees = escrow.buyer_fee_token_amount + escrow.seller_fee_token_amount;
        if total_fees > 0 {
            client.transfer(&env.current_contract_address(), &escrow.fee_recipient, &total_fees);
        }

        env.storage().persistent().set(&DataKey::CustodyEscrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "EscrowCompletedV2"), escrow_id), ());
    }

    pub fn get_custody_escrow(env: Env, escrow_id: u64) -> CustodyEscrow {
        env.storage()
            .persistent()
            .get(&DataKey::CustodyEscrow(escrow_id))
            .expect("CustodyEscrow not found")
    }
}

mod test;
mod test_v2;
