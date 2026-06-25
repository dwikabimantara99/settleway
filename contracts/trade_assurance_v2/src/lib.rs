#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN,
    Env, String,
};

const POLICY_INTERFACE_VERSION: u32 = 1;
const INSTANCE_TTL_THRESHOLD: u32 = 30 * 24 * 60;
const INSTANCE_TTL_EXTEND_TO: u32 = 90 * 24 * 60;
const DEAL_TTL_THRESHOLD: u32 = 30 * 24 * 60;
const DEAL_TTL_EXTEND_TO: u32 = 180 * 24 * 60;

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAsset = 3,
    InvalidPolicyVersion = 4,
    DuplicateDeal = 10,
    DealNotFound = 11,
    UnauthorizedParticipant = 12,
    BuyerSellerSame = 13,
    InvalidAmount = 14,
    AmountOverflow = 15,
    InvalidDeadline = 16,
    InvalidState = 20,
    TermsAlreadyAccepted = 21,
    TermsNotAccepted = 22,
    AlreadyFunded = 23,
    FundingDeadlinePassed = 24,
    FundingDeadlineOpen = 25,
    EvidenceAlreadySubmitted = 26,
    TerminalState = 27,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DealState {
    TermsPending = 0,
    AwaitingFunding = 1,
    Active = 2,
    EvidenceSubmitted = 3,
    SettledSuccess = 4,
    FundingExpired = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TerminalOutcome {
    None = 0,
    SettledSuccess = 1,
    FundingExpired = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub initialized: bool,
    pub accepted_asset: Address,
    pub policy_version: u32,
    pub interface_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deal {
    pub deal_id: BytesN<32>,
    pub buyer: Address,
    pub seller: Address,
    pub creator: Address,
    pub terms_hash: BytesN<32>,
    pub principal: i128,
    pub buyer_bond: i128,
    pub seller_bond: i128,
    pub funding_deadline: u64,
    pub delivery_deadline: u64,
    pub inspection_deadline: u64,
    pub policy_version: u32,
    pub buyer_terms_accepted: bool,
    pub seller_terms_accepted: bool,
    pub buyer_funded: bool,
    pub seller_funded: bool,
    pub evidence_commitment: Option<BytesN<32>>,
    pub state: DealState,
    pub terminal_outcome: TerminalOutcome,
    pub created_ledger_timestamp: u64,
    pub last_updated_ledger_timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractInfo {
    pub name: String,
    pub interface_version: u32,
    pub policy_version: u32,
}

#[contractevent(topics = ["init"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InitializedEvent {
    #[topic]
    pub asset: Address,
    pub initializer: Address,
    pub policy_version: u32,
    pub interface_version: u32,
}

#[contractevent(topics = ["deal"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DealCreatedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub buyer: Address,
    pub seller: Address,
    pub principal: i128,
    pub buyer_bond: i128,
    pub seller_bond: i128,
}

#[contractevent(topics = ["accept"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TermsAcceptedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    #[topic]
    pub participant: Address,
}

#[contractevent(topics = ["state"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StateChangedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub from: DealState,
    pub to: DealState,
    pub timestamp: u64,
}

#[contractevent(topics = ["bfund"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BuyerFundedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub participant: Address,
    pub amount: i128,
    pub buyer_funded: bool,
    pub seller_funded: bool,
}

#[contractevent(topics = ["sfund"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SellerFundedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub participant: Address,
    pub amount: i128,
    pub buyer_funded: bool,
    pub seller_funded: bool,
}

#[contractevent(topics = ["active"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DealActivatedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
}

#[contractevent(topics = ["evidence"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EvidenceSubmittedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub evidence_hash: BytesN<32>,
}

#[contractevent(topics = ["expired"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FundingExpiredEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub buyer_funded: bool,
    pub seller_funded: bool,
    pub buyer_refund: i128,
    pub seller_refund: i128,
}

#[contractevent(topics = ["settled"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementCompletedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub seller_principal: i128,
    pub buyer_bond_refund: i128,
    pub seller_bond_refund: i128,
}

#[contracttype]
pub enum DataKey {
    Config,
    Deal(BytesN<32>),
}

#[contract]
pub struct SettlewayCustodyV2;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl SettlewayCustodyV2 {
    pub fn initialize(
        env: Env,
        initializer: Address,
        accepted_asset: Address,
        policy_version: u32,
    ) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(ContractError::AlreadyInitialized);
        }
        if policy_version == 0 {
            return Err(ContractError::InvalidPolicyVersion);
        }

        initializer.require_auth();
        let token_client = token::TokenClient::new(&env, &accepted_asset);
        if token_client.decimals() > 18 {
            return Err(ContractError::InvalidAsset);
        }

        let config = Config {
            initialized: true,
            accepted_asset: accepted_asset.clone(),
            policy_version,
            interface_version: POLICY_INTERFACE_VERSION,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        extend_instance_ttl(&env);
        InitializedEvent {
            asset: accepted_asset,
            initializer,
            policy_version,
            interface_version: POLICY_INTERFACE_VERSION,
        }
        .publish(&env);
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_deal(
        env: Env,
        deal_id: BytesN<32>,
        creator: Address,
        buyer: Address,
        seller: Address,
        terms_hash: BytesN<32>,
        principal: i128,
        buyer_bond: i128,
        seller_bond: i128,
        funding_deadline: u64,
        delivery_deadline: u64,
        inspection_deadline: u64,
    ) -> Result<(), ContractError> {
        let config = read_config(&env)?;
        creator.require_auth();
        if creator != buyer && creator != seller {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if buyer == seller {
            return Err(ContractError::BuyerSellerSame);
        }
        require_positive(principal)?;
        require_positive(buyer_bond)?;
        require_positive(seller_bond)?;
        validate_deadlines(
            &env,
            funding_deadline,
            delivery_deadline,
            inspection_deadline,
        )?;
        let key = DataKey::Deal(deal_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(ContractError::DuplicateDeal);
        }

        let now = env.ledger().timestamp();
        let creator_is_buyer = creator == buyer;
        let deal = Deal {
            deal_id: deal_id.clone(),
            buyer: buyer.clone(),
            seller: seller.clone(),
            creator,
            terms_hash,
            principal,
            buyer_bond,
            seller_bond,
            funding_deadline,
            delivery_deadline,
            inspection_deadline,
            policy_version: config.policy_version,
            buyer_terms_accepted: creator_is_buyer,
            seller_terms_accepted: !creator_is_buyer,
            buyer_funded: false,
            seller_funded: false,
            evidence_commitment: None,
            state: DealState::TermsPending,
            terminal_outcome: TerminalOutcome::None,
            created_ledger_timestamp: now,
            last_updated_ledger_timestamp: now,
        };
        write_deal(&env, &deal)?;
        DealCreatedEvent {
            deal_id,
            buyer,
            seller,
            principal,
            buyer_bond,
            seller_bond,
        }
        .publish(&env);
        Ok(())
    }

    pub fn accept_terms(
        env: Env,
        deal_id: BytesN<32>,
        participant: Address,
    ) -> Result<(), ContractError> {
        participant.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::TermsPending)?;
        if participant != deal.buyer && participant != deal.seller {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if participant == deal.buyer {
            if deal.buyer_terms_accepted {
                return Err(ContractError::TermsAlreadyAccepted);
            }
            deal.buyer_terms_accepted = true;
        } else {
            if deal.seller_terms_accepted {
                return Err(ContractError::TermsAlreadyAccepted);
            }
            deal.seller_terms_accepted = true;
        }

        let mut transitioned = None;
        if deal.buyer_terms_accepted && deal.seller_terms_accepted {
            transitioned = Some((deal.state.clone(), DealState::AwaitingFunding));
            deal.state = DealState::AwaitingFunding;
        }
        deal.last_updated_ledger_timestamp = env.ledger().timestamp();
        write_deal(&env, &deal)?;
        TermsAcceptedEvent {
            deal_id: deal_id.clone(),
            participant,
        }
        .publish(&env);
        if let Some((from, to)) = transitioned {
            publish_state_change(&env, &deal_id, from, to);
        }
        Ok(())
    }

    pub fn fund_buyer(env: Env, deal_id: BytesN<32>, buyer: Address) -> Result<(), ContractError> {
        buyer.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::AwaitingFunding)?;
        require_terms_accepted(&deal)?;
        require_before_deadline(&env, deal.funding_deadline)?;
        if buyer != deal.buyer {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if deal.buyer_funded {
            return Err(ContractError::AlreadyFunded);
        }
        let amount = checked_add(deal.principal, deal.buyer_bond)?;
        transfer_to_contract(&env, &buyer, amount)?;
        deal.buyer_funded = true;
        BuyerFundedEvent {
            deal_id: deal_id.clone(),
            participant: buyer,
            amount,
            buyer_funded: true,
            seller_funded: deal.seller_funded,
        }
        .publish(&env);
        activate_if_fully_funded(&env, &deal_id, &mut deal)?;
        write_deal(&env, &deal)?;
        Ok(())
    }

    pub fn fund_seller(
        env: Env,
        deal_id: BytesN<32>,
        seller: Address,
    ) -> Result<(), ContractError> {
        seller.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::AwaitingFunding)?;
        require_terms_accepted(&deal)?;
        require_before_deadline(&env, deal.funding_deadline)?;
        if seller != deal.seller {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if deal.seller_funded {
            return Err(ContractError::AlreadyFunded);
        }
        let amount = deal.seller_bond;
        transfer_to_contract(&env, &seller, amount)?;
        deal.seller_funded = true;
        SellerFundedEvent {
            deal_id: deal_id.clone(),
            participant: seller,
            amount,
            buyer_funded: deal.buyer_funded,
            seller_funded: true,
        }
        .publish(&env);
        activate_if_fully_funded(&env, &deal_id, &mut deal)?;
        write_deal(&env, &deal)?;
        Ok(())
    }

    pub fn expire_funding(env: Env, deal_id: BytesN<32>) -> Result<(), ContractError> {
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::AwaitingFunding)?;
        if env.ledger().timestamp() <= deal.funding_deadline {
            return Err(ContractError::FundingDeadlineOpen);
        }

        let buyer_refund = if deal.buyer_funded {
            checked_add(deal.principal, deal.buyer_bond)?
        } else {
            0
        };
        let seller_refund = if deal.seller_funded {
            deal.seller_bond
        } else {
            0
        };

        if buyer_refund > 0 {
            transfer_from_contract(&env, &deal.buyer, buyer_refund)?;
        }
        if seller_refund > 0 {
            transfer_from_contract(&env, &deal.seller, seller_refund)?;
        }

        let previous_state = deal.state.clone();
        deal.state = DealState::FundingExpired;
        deal.terminal_outcome = TerminalOutcome::FundingExpired;
        deal.last_updated_ledger_timestamp = env.ledger().timestamp();
        write_deal(&env, &deal)?;
        FundingExpiredEvent {
            deal_id: deal_id.clone(),
            buyer_funded: deal.buyer_funded,
            seller_funded: deal.seller_funded,
            buyer_refund,
            seller_refund,
        }
        .publish(&env);
        publish_state_change(&env, &deal_id, previous_state, DealState::FundingExpired);
        Ok(())
    }

    pub fn submit_evidence(
        env: Env,
        deal_id: BytesN<32>,
        seller: Address,
        evidence_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        seller.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::Active)?;
        if seller != deal.seller {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if deal.evidence_commitment.is_some() {
            return Err(ContractError::EvidenceAlreadySubmitted);
        }
        deal.evidence_commitment = Some(evidence_hash.clone());
        let previous_state = deal.state.clone();
        deal.state = DealState::EvidenceSubmitted;
        deal.last_updated_ledger_timestamp = env.ledger().timestamp();
        write_deal(&env, &deal)?;
        EvidenceSubmittedEvent {
            deal_id: deal_id.clone(),
            evidence_hash,
        }
        .publish(&env);
        publish_state_change(&env, &deal_id, previous_state, DealState::EvidenceSubmitted);
        Ok(())
    }

    pub fn accept_delivery(
        env: Env,
        deal_id: BytesN<32>,
        buyer: Address,
    ) -> Result<(), ContractError> {
        buyer.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::EvidenceSubmitted)?;
        if buyer != deal.buyer {
            return Err(ContractError::UnauthorizedParticipant);
        }

        transfer_from_contract(&env, &deal.seller, deal.principal)?;
        transfer_from_contract(&env, &deal.buyer, deal.buyer_bond)?;
        transfer_from_contract(&env, &deal.seller, deal.seller_bond)?;

        let previous_state = deal.state.clone();
        deal.state = DealState::SettledSuccess;
        deal.terminal_outcome = TerminalOutcome::SettledSuccess;
        deal.last_updated_ledger_timestamp = env.ledger().timestamp();
        write_deal(&env, &deal)?;
        SettlementCompletedEvent {
            deal_id: deal_id.clone(),
            seller_principal: deal.principal,
            buyer_bond_refund: deal.buyer_bond,
            seller_bond_refund: deal.seller_bond,
        }
        .publish(&env);
        publish_state_change(&env, &deal_id, previous_state, DealState::SettledSuccess);
        Ok(())
    }

    pub fn get_config(env: Env) -> Result<Config, ContractError> {
        read_config(&env)
    }

    pub fn get_deal(env: Env, deal_id: BytesN<32>) -> Result<Deal, ContractError> {
        read_deal(&env, &deal_id)
    }

    pub fn deal_exists(env: Env, deal_id: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Deal(deal_id.clone()))
    }

    pub fn get_state(env: Env, deal_id: BytesN<32>) -> Result<DealState, ContractError> {
        Ok(read_deal(&env, &deal_id)?.state)
    }

    pub fn contract_info(env: Env) -> Result<ContractInfo, ContractError> {
        let config = read_config(&env)?;
        Ok(ContractInfo {
            name: String::from_str(&env, "settleway_trade_assurance_v2"),
            interface_version: config.interface_version,
            policy_version: config.policy_version,
        })
    }
}

fn read_config(env: &Env) -> Result<Config, ContractError> {
    extend_instance_ttl(env);
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(ContractError::NotInitialized)
}

fn read_deal(env: &Env, deal_id: &BytesN<32>) -> Result<Deal, ContractError> {
    let key = DataKey::Deal(deal_id.clone());
    let deal = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::DealNotFound)?;
    extend_deal_ttl(env, deal_id);
    Ok(deal)
}

fn write_deal(env: &Env, deal: &Deal) -> Result<(), ContractError> {
    let key = DataKey::Deal(deal.deal_id.clone());
    env.storage().persistent().set(&key, deal);
    extend_deal_ttl(env, &deal.deal_id);
    Ok(())
}

fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
}

fn extend_deal_ttl(env: &Env, deal_id: &BytesN<32>) {
    env.storage().persistent().extend_ttl(
        &DataKey::Deal(deal_id.clone()),
        DEAL_TTL_THRESHOLD,
        DEAL_TTL_EXTEND_TO,
    );
}

fn require_positive(amount: i128) -> Result<(), ContractError> {
    if amount <= 0 {
        return Err(ContractError::InvalidAmount);
    }
    Ok(())
}

fn checked_add(a: i128, b: i128) -> Result<i128, ContractError> {
    a.checked_add(b).ok_or(ContractError::AmountOverflow)
}

fn validate_deadlines(
    env: &Env,
    funding_deadline: u64,
    delivery_deadline: u64,
    inspection_deadline: u64,
) -> Result<(), ContractError> {
    let now = env.ledger().timestamp();
    if funding_deadline <= now
        || delivery_deadline <= funding_deadline
        || inspection_deadline <= delivery_deadline
    {
        return Err(ContractError::InvalidDeadline);
    }
    Ok(())
}

fn require_state(deal: &Deal, state: DealState) -> Result<(), ContractError> {
    if deal.state == DealState::SettledSuccess || deal.state == DealState::FundingExpired {
        return Err(ContractError::TerminalState);
    }
    if deal.state != state {
        return Err(ContractError::InvalidState);
    }
    Ok(())
}

fn require_terms_accepted(deal: &Deal) -> Result<(), ContractError> {
    if !deal.buyer_terms_accepted || !deal.seller_terms_accepted {
        return Err(ContractError::TermsNotAccepted);
    }
    Ok(())
}

fn require_before_deadline(env: &Env, funding_deadline: u64) -> Result<(), ContractError> {
    if env.ledger().timestamp() >= funding_deadline {
        return Err(ContractError::FundingDeadlinePassed);
    }
    Ok(())
}

fn activate_if_fully_funded(
    env: &Env,
    deal_id: &BytesN<32>,
    deal: &mut Deal,
) -> Result<(), ContractError> {
    if deal.buyer_funded && deal.seller_funded {
        let previous_state = deal.state.clone();
        deal.state = DealState::Active;
        deal.last_updated_ledger_timestamp = env.ledger().timestamp();
        DealActivatedEvent {
            deal_id: deal_id.clone(),
        }
        .publish(env);
        publish_state_change(env, deal_id, previous_state, DealState::Active);
    } else {
        deal.last_updated_ledger_timestamp = env.ledger().timestamp();
    }
    Ok(())
}

fn transfer_to_contract(env: &Env, from: &Address, amount: i128) -> Result<(), ContractError> {
    let config = read_config(env)?;
    let token_client = token::TokenClient::new(env, &config.accepted_asset);
    token_client.transfer(from, env.current_contract_address(), &amount);
    Ok(())
}

fn transfer_from_contract(env: &Env, to: &Address, amount: i128) -> Result<(), ContractError> {
    let config = read_config(env)?;
    let token_client = token::TokenClient::new(env, &config.accepted_asset);
    token_client.transfer(&env.current_contract_address(), to, &amount);
    Ok(())
}

fn publish_state_change(env: &Env, deal_id: &BytesN<32>, from: DealState, to: DealState) {
    StateChangedEvent {
        deal_id: deal_id.clone(),
        from,
        to,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

mod test;
