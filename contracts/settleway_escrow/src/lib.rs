#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Symbol};

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

const ADMIN_KEY: Symbol = Symbol::short("ADMIN");
const ESCROW_COUNTER_KEY: Symbol = Symbol::short("COUNTER");

#[contracttype]
pub enum DataKey {
    Escrow(u64),
}

#[contract]
pub struct SettlewayEscrowContract;

#[contractimpl]
impl SettlewayEscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&ESCROW_COUNTER_KEY, &0u64);
    }

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
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).expect("Not initialized");
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

        env.storage().persistent().set(&DataKey::Escrow(counter), &escrow);
        env.storage().instance().set(&ESCROW_COUNTER_KEY, &counter);

        env.events().publish((Symbol::new(&env, "EscrowCreated"), counter), (deal_hash, buyer, seller, principal));

        counter
    }

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

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "BuyerDeposited"), escrow_id), actor);

        if escrow.status == EscrowStatus::Locked {
            env.events().publish((Symbol::new(&env, "EscrowLocked"), escrow_id), ());
        }
    }

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

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "SellerDeposited"), escrow_id), actor);

        if escrow.status == EscrowStatus::Locked {
            env.events().publish((Symbol::new(&env, "EscrowLocked"), escrow_id), ());
        }
    }

    pub fn lock_if_ready(env: Env, escrow_id: u64) {
        // In our implementation, deposits automatically lock if both are present.
        // This function can be a fallback manual trigger by admin if needed.
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).expect("Not initialized");
        admin.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if escrow.status == EscrowStatus::BuyerFunded || escrow.status == EscrowStatus::SellerFunded {
            panic!("Not both funded"); // Event contract logic assumes both funded happens in deposit functions
        }
    }

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

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "ProofSubmitted"), escrow_id), proof_hash);
    }

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
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "DeliveryMarked"), escrow_id), ());
    }

    pub fn accept_and_complete(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if escrow.buyer != actor {
            panic!("Not the buyer");
        }
        if escrow.status != EscrowStatus::Delivered && escrow.status != EscrowStatus::ProofSubmitted {
            panic!("Invalid state for acceptance");
        }

        escrow.status = EscrowStatus::Completed;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.events().publish((Symbol::new(&env, "DeliveryAccepted"), escrow_id), ());
        env.events().publish((Symbol::new(&env, "PaymentReleased"), escrow_id), ());
        env.events().publish((Symbol::new(&env, "TransactionCompleted"), escrow_id), ());
    }

    pub fn expire_if_unfunded(env: Env, escrow_id: u64, now: u64) {
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        if now < escrow.expires_at {
            panic!("Not expired yet");
        }
        match escrow.status {
            EscrowStatus::WaitingDeposits | EscrowStatus::BuyerFunded | EscrowStatus::SellerFunded => {
                escrow.status = EscrowStatus::Expired;
                env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
                env.events().publish((Symbol::new(&env, "EscrowExpired"), escrow_id), ());
            },
            _ => panic!("Too late to expire"),
        }
    }

    pub fn refund_before_locked(env: Env, escrow_id: u64, actor: Address) {
        actor.require_auth();
        let mut escrow: Escrow = Self::get_escrow(env.clone(), escrow_id);
        
        let is_admin = actor == env.storage().instance().get(&ADMIN_KEY).unwrap();
        if !is_admin && actor != escrow.buyer && actor != escrow.seller {
            panic!("Unauthorized");
        }

        match escrow.status {
            EscrowStatus::WaitingDeposits | EscrowStatus::BuyerFunded | EscrowStatus::SellerFunded => {
                escrow.status = EscrowStatus::Refunded;
                env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
                env.events().publish((Symbol::new(&env, "RefundIssued"), escrow_id), ());
            },
            _ => panic!("Cannot refund after locked"),
        }
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        env.storage().persistent().get(&DataKey::Escrow(escrow_id)).expect("Escrow not found")
    }
}

mod test;
