#![no_std]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN,
    Env, String,
};

const POLICY_INTERFACE_VERSION: u32 = 2;
const BPS_DENOMINATOR: i128 = 10_000;
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
    InvalidBasisPoints = 5,
    InvalidTreasury = 6,
    DuplicateDeal = 10,
    DealNotFound = 11,
    UnauthorizedParticipant = 12,
    BuyerSellerSame = 13,
    InvalidAmount = 14,
    AmountOverflow = 15,
    InvalidDeadline = 16,
    InvalidMediator = 17,
    InvalidState = 20,
    TermsAlreadyAccepted = 21,
    TermsNotAccepted = 22,
    AlreadyFunded = 23,
    FundingDeadlinePassed = 24,
    FundingDeadlineOpen = 25,
    EvidenceAlreadySubmitted = 26,
    TerminalState = 27,
    DeliveryDeadlinePassed = 28,
    DeliveryDeadlineOpen = 29,
    InspectionDeadlinePassed = 30,
    InspectionDeadlineOpen = 31,
    CancellationAlreadyApproved = 32,
    DisputeAlreadyRaised = 33,
    DisputeNotAllowed = 34,
    EvidenceRequired = 35,
    InvalidDisputeOutcome = 36,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DealState {
    TermsPending = 0,
    AwaitingFunding = 1,
    Active = 2,
    EvidenceSubmitted = 3,
    Disputed = 4,
    SettledSuccess = 5,
    FundingExpired = 6,
    SellerBreach = 7,
    BuyerBreach = 8,
    MutualCancellation = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TerminalOutcome {
    None = 0,
    SettledSuccess = 1,
    FundingExpired = 2,
    SellerBreach = 3,
    BuyerBreach = 4,
    MutualCancellation = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeOutcome {
    SettledSuccess = 1,
    SellerBreach = 2,
    BuyerBreach = 3,
    MutualCancellation = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub initialized: bool,
    pub accepted_asset: Address,
    pub treasury: Address,
    pub policy_version: u32,
    pub interface_version: u32,
    pub success_fee_bps: u32,
    pub seller_breach_treasury_bps: u32,
    pub buyer_breach_treasury_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deal {
    pub deal_id: BytesN<32>,
    pub buyer: Address,
    pub seller: Address,
    pub mediator: Address,
    pub creator: Address,
    pub terms_hash: BytesN<32>,
    pub accepted_asset: Address,
    pub treasury: Address,
    pub principal: i128,
    pub buyer_bond: i128,
    pub seller_bond: i128,
    pub funding_deadline: u64,
    pub delivery_deadline: u64,
    pub inspection_deadline: u64,
    pub policy_version: u32,
    pub success_fee_bps: u32,
    pub seller_breach_treasury_bps: u32,
    pub buyer_breach_treasury_bps: u32,
    pub buyer_terms_accepted: bool,
    pub seller_terms_accepted: bool,
    pub buyer_funded: bool,
    pub seller_funded: bool,
    pub buyer_cancellation_approved: bool,
    pub seller_cancellation_approved: bool,
    pub evidence_commitment: Option<BytesN<32>>,
    pub disputed: bool,
    pub dispute_opener: Option<Address>,
    pub dispute_reason_hash: Option<BytesN<32>>,
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

#[derive(Clone, Debug, Eq, PartialEq)]
struct Distribution {
    buyer_principal_refund: i128,
    seller_principal: i128,
    buyer_bond_refund: i128,
    seller_bond_refund: i128,
    buyer_bond_to_seller: i128,
    buyer_bond_to_treasury: i128,
    seller_bond_to_buyer: i128,
    seller_bond_to_treasury: i128,
    success_fee_to_treasury: i128,
}

#[contractevent(topics = ["init"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InitializedEvent {
    #[topic]
    pub asset: Address,
    pub treasury: Address,
    pub initializer: Address,
    pub policy_version: u32,
    pub interface_version: u32,
    pub success_fee_bps: u32,
    pub seller_breach_treasury_bps: u32,
    pub buyer_breach_treasury_bps: u32,
}

#[contractevent(topics = ["deal"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DealCreatedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub buyer: Address,
    pub seller: Address,
    pub mediator: Address,
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

#[contractevent(topics = ["cancel"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CancellationApprovedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    #[topic]
    pub participant: Address,
    pub buyer_approved: bool,
    pub seller_approved: bool,
}

#[contractevent(topics = ["dispute"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisputeRaisedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    #[topic]
    pub opener: Address,
    pub previous_state: DealState,
    pub reason_hash: BytesN<32>,
}

#[contractevent(topics = ["resolve"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisputeResolvedEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    #[topic]
    pub mediator: Address,
    pub outcome: DisputeOutcome,
}

#[contractevent(topics = ["settlement"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementDistributionEvent {
    #[topic]
    pub deal_id: BytesN<32>,
    pub outcome: TerminalOutcome,
    pub buyer_principal_refund: i128,
    pub seller_principal: i128,
    pub buyer_bond_refund: i128,
    pub seller_bond_refund: i128,
    pub buyer_bond_to_seller: i128,
    pub buyer_bond_to_treasury: i128,
    pub seller_bond_to_buyer: i128,
    pub seller_bond_to_treasury: i128,
    pub success_fee_to_treasury: i128,
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
        treasury: Address,
        policy_version: u32,
        success_fee_bps: u32,
        seller_breach_treasury_bps: u32,
        buyer_breach_treasury_bps: u32,
    ) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(ContractError::AlreadyInitialized);
        }
        if policy_version == 0 {
            return Err(ContractError::InvalidPolicyVersion);
        }
        validate_bps(success_fee_bps)?;
        validate_bps(seller_breach_treasury_bps)?;
        validate_bps(buyer_breach_treasury_bps)?;
        if treasury == env.current_contract_address() || treasury == accepted_asset {
            return Err(ContractError::InvalidTreasury);
        }

        initializer.require_auth();
        let token_client = token::TokenClient::new(&env, &accepted_asset);
        if token_client.decimals() > 18 {
            return Err(ContractError::InvalidAsset);
        }

        let config = Config {
            initialized: true,
            accepted_asset: accepted_asset.clone(),
            treasury: treasury.clone(),
            policy_version,
            interface_version: POLICY_INTERFACE_VERSION,
            success_fee_bps,
            seller_breach_treasury_bps,
            buyer_breach_treasury_bps,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        extend_instance_ttl(&env);
        InitializedEvent {
            asset: accepted_asset,
            treasury,
            initializer,
            policy_version,
            interface_version: POLICY_INTERFACE_VERSION,
            success_fee_bps,
            seller_breach_treasury_bps,
            buyer_breach_treasury_bps,
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
        mediator: Address,
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
        if mediator == buyer || mediator == seller || mediator == env.current_contract_address() {
            return Err(ContractError::InvalidMediator);
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
            mediator: mediator.clone(),
            creator,
            terms_hash,
            accepted_asset: config.accepted_asset,
            treasury: config.treasury,
            principal,
            buyer_bond,
            seller_bond,
            funding_deadline,
            delivery_deadline,
            inspection_deadline,
            policy_version: config.policy_version,
            success_fee_bps: config.success_fee_bps,
            seller_breach_treasury_bps: config.seller_breach_treasury_bps,
            buyer_breach_treasury_bps: config.buyer_breach_treasury_bps,
            buyer_terms_accepted: creator_is_buyer,
            seller_terms_accepted: !creator_is_buyer,
            buyer_funded: false,
            seller_funded: false,
            buyer_cancellation_approved: false,
            seller_cancellation_approved: false,
            evidence_commitment: None,
            disputed: false,
            dispute_opener: None,
            dispute_reason_hash: None,
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
            mediator,
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
        require_before_funding_deadline(&env, deal.funding_deadline)?;
        if buyer != deal.buyer {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if deal.buyer_funded {
            return Err(ContractError::AlreadyFunded);
        }
        let amount = checked_add(deal.principal, deal.buyer_bond)?;
        transfer_to_contract(&env, &buyer, amount, &deal.accepted_asset)?;
        deal.buyer_funded = true;
        BuyerFundedEvent {
            deal_id: deal_id.clone(),
            participant: buyer,
            amount,
            buyer_funded: true,
            seller_funded: deal.seller_funded,
        }
        .publish(&env);
        activate_if_fully_funded(&env, &deal_id, &mut deal);
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
        require_before_funding_deadline(&env, deal.funding_deadline)?;
        if seller != deal.seller {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if deal.seller_funded {
            return Err(ContractError::AlreadyFunded);
        }
        let amount = deal.seller_bond;
        transfer_to_contract(&env, &seller, amount, &deal.accepted_asset)?;
        deal.seller_funded = true;
        SellerFundedEvent {
            deal_id: deal_id.clone(),
            participant: seller,
            amount,
            buyer_funded: deal.buyer_funded,
            seller_funded: true,
        }
        .publish(&env);
        activate_if_fully_funded(&env, &deal_id, &mut deal);
        write_deal(&env, &deal)?;
        Ok(())
    }

    pub fn expire_funding(env: Env, deal_id: BytesN<32>) -> Result<(), ContractError> {
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::AwaitingFunding)?;
        if env.ledger().timestamp() < deal.funding_deadline {
            return Err(ContractError::FundingDeadlineOpen);
        }
        settle_funding_expiry(&env, &deal_id, &mut deal)
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
        require_before_delivery_deadline(&env, deal.delivery_deadline)?;
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
        require_before_inspection_deadline(&env, deal.inspection_deadline)?;
        if buyer != deal.buyer {
            return Err(ContractError::UnauthorizedParticipant);
        }
        settle_success(&env, &deal_id, &mut deal)
    }

    pub fn expire_delivery(env: Env, deal_id: BytesN<32>) -> Result<(), ContractError> {
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::Active)?;
        if env.ledger().timestamp() < deal.delivery_deadline {
            return Err(ContractError::DeliveryDeadlineOpen);
        }
        if deal.evidence_commitment.is_some() {
            return Err(ContractError::InvalidState);
        }
        settle_seller_breach(&env, &deal_id, &mut deal)
    }

    pub fn expire_inspection(env: Env, deal_id: BytesN<32>) -> Result<(), ContractError> {
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::EvidenceSubmitted)?;
        if env.ledger().timestamp() < deal.inspection_deadline {
            return Err(ContractError::InspectionDeadlineOpen);
        }
        settle_buyer_breach(&env, &deal_id, &mut deal)
    }

    pub fn approve_mutual_cancellation(
        env: Env,
        deal_id: BytesN<32>,
        participant: Address,
    ) -> Result<(), ContractError> {
        participant.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::Active)?;
        require_before_delivery_deadline(&env, deal.delivery_deadline)?;
        if participant != deal.buyer && participant != deal.seller {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if participant == deal.buyer {
            if deal.buyer_cancellation_approved {
                return Err(ContractError::CancellationAlreadyApproved);
            }
            deal.buyer_cancellation_approved = true;
        } else {
            if deal.seller_cancellation_approved {
                return Err(ContractError::CancellationAlreadyApproved);
            }
            deal.seller_cancellation_approved = true;
        }
        CancellationApprovedEvent {
            deal_id: deal_id.clone(),
            participant,
            buyer_approved: deal.buyer_cancellation_approved,
            seller_approved: deal.seller_cancellation_approved,
        }
        .publish(&env);
        if deal.buyer_cancellation_approved && deal.seller_cancellation_approved {
            settle_mutual_cancellation(&env, &deal_id, &mut deal)
        } else {
            deal.last_updated_ledger_timestamp = env.ledger().timestamp();
            write_deal(&env, &deal)
        }
    }

    pub fn raise_dispute(
        env: Env,
        deal_id: BytesN<32>,
        participant: Address,
        reason_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        participant.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        if participant != deal.buyer && participant != deal.seller {
            return Err(ContractError::UnauthorizedParticipant);
        }
        if deal.disputed {
            return Err(ContractError::DisputeAlreadyRaised);
        }
        let previous_state = deal.state.clone();
        match previous_state {
            DealState::Active => require_before_delivery_deadline(&env, deal.delivery_deadline)?,
            DealState::EvidenceSubmitted => {
                require_before_inspection_deadline(&env, deal.inspection_deadline)?
            }
            _ => return Err(ContractError::DisputeNotAllowed),
        }
        deal.disputed = true;
        deal.dispute_opener = Some(participant.clone());
        deal.dispute_reason_hash = Some(reason_hash.clone());
        deal.state = DealState::Disputed;
        deal.last_updated_ledger_timestamp = env.ledger().timestamp();
        write_deal(&env, &deal)?;
        DisputeRaisedEvent {
            deal_id: deal_id.clone(),
            opener: participant,
            previous_state: previous_state.clone(),
            reason_hash,
        }
        .publish(&env);
        publish_state_change(&env, &deal_id, previous_state, DealState::Disputed);
        Ok(())
    }

    pub fn resolve_dispute(
        env: Env,
        deal_id: BytesN<32>,
        mediator: Address,
        outcome: DisputeOutcome,
    ) -> Result<(), ContractError> {
        mediator.require_auth();
        let mut deal = read_deal(&env, &deal_id)?;
        require_state(&deal, DealState::Disputed)?;
        if mediator != deal.mediator {
            return Err(ContractError::UnauthorizedParticipant);
        }
        DisputeResolvedEvent {
            deal_id: deal_id.clone(),
            mediator,
            outcome: outcome.clone(),
        }
        .publish(&env);
        match outcome {
            DisputeOutcome::SettledSuccess => {
                if deal.evidence_commitment.is_none() {
                    return Err(ContractError::EvidenceRequired);
                }
                settle_success(&env, &deal_id, &mut deal)
            }
            DisputeOutcome::SellerBreach => settle_seller_breach(&env, &deal_id, &mut deal),
            DisputeOutcome::BuyerBreach => settle_buyer_breach(&env, &deal_id, &mut deal),
            DisputeOutcome::MutualCancellation => {
                settle_mutual_cancellation(&env, &deal_id, &mut deal)
            }
        }
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
            name: String::from_str(&env, "settleway_trade_assurance_v2_1"),
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

fn validate_bps(value: u32) -> Result<(), ContractError> {
    if value > 10_000 {
        return Err(ContractError::InvalidBasisPoints);
    }
    Ok(())
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

fn checked_sub(a: i128, b: i128) -> Result<i128, ContractError> {
    a.checked_sub(b).ok_or(ContractError::AmountOverflow)
}

fn checked_sum(values: &[i128]) -> Result<i128, ContractError> {
    let mut total = 0;
    for value in values {
        total = checked_add(total, *value)?;
    }
    Ok(total)
}

fn bps_share(amount: i128, bps: u32) -> Result<i128, ContractError> {
    amount
        .checked_mul(bps as i128)
        .ok_or(ContractError::AmountOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ContractError::AmountOverflow)
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
    if is_terminal(&deal.state) {
        return Err(ContractError::TerminalState);
    }
    if deal.state != state {
        return Err(ContractError::InvalidState);
    }
    Ok(())
}

fn is_terminal(state: &DealState) -> bool {
    matches!(
        state,
        DealState::SettledSuccess
            | DealState::FundingExpired
            | DealState::SellerBreach
            | DealState::BuyerBreach
            | DealState::MutualCancellation
    )
}

fn require_terms_accepted(deal: &Deal) -> Result<(), ContractError> {
    if !deal.buyer_terms_accepted || !deal.seller_terms_accepted {
        return Err(ContractError::TermsNotAccepted);
    }
    Ok(())
}

fn require_before_funding_deadline(env: &Env, deadline: u64) -> Result<(), ContractError> {
    if env.ledger().timestamp() >= deadline {
        return Err(ContractError::FundingDeadlinePassed);
    }
    Ok(())
}

fn require_before_delivery_deadline(env: &Env, deadline: u64) -> Result<(), ContractError> {
    if env.ledger().timestamp() >= deadline {
        return Err(ContractError::DeliveryDeadlinePassed);
    }
    Ok(())
}

fn require_before_inspection_deadline(env: &Env, deadline: u64) -> Result<(), ContractError> {
    if env.ledger().timestamp() >= deadline {
        return Err(ContractError::InspectionDeadlinePassed);
    }
    Ok(())
}

fn activate_if_fully_funded(env: &Env, deal_id: &BytesN<32>, deal: &mut Deal) {
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
}

fn settle_funding_expiry(
    env: &Env,
    deal_id: &BytesN<32>,
    deal: &mut Deal,
) -> Result<(), ContractError> {
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
        transfer_from_contract(env, &deal.buyer, buyer_refund, &deal.accepted_asset)?;
    }
    if seller_refund > 0 {
        transfer_from_contract(env, &deal.seller, seller_refund, &deal.accepted_asset)?;
    }

    let previous_state = deal.state.clone();
    deal.state = DealState::FundingExpired;
    deal.terminal_outcome = TerminalOutcome::FundingExpired;
    deal.last_updated_ledger_timestamp = env.ledger().timestamp();
    write_deal(env, deal)?;
    FundingExpiredEvent {
        deal_id: deal_id.clone(),
        buyer_funded: deal.buyer_funded,
        seller_funded: deal.seller_funded,
        buyer_refund,
        seller_refund,
    }
    .publish(env);
    publish_state_change(env, deal_id, previous_state, DealState::FundingExpired);
    Ok(())
}

fn success_distribution(deal: &Deal) -> Result<Distribution, ContractError> {
    let success_fee = bps_share(deal.principal, deal.success_fee_bps)?;
    let seller_principal = checked_sub(deal.principal, success_fee)?;
    Ok(Distribution {
        buyer_principal_refund: 0,
        seller_principal,
        buyer_bond_refund: deal.buyer_bond,
        seller_bond_refund: deal.seller_bond,
        buyer_bond_to_seller: 0,
        buyer_bond_to_treasury: 0,
        seller_bond_to_buyer: 0,
        seller_bond_to_treasury: 0,
        success_fee_to_treasury: success_fee,
    })
}

fn seller_breach_distribution(deal: &Deal) -> Result<Distribution, ContractError> {
    let treasury_share = bps_share(deal.seller_bond, deal.seller_breach_treasury_bps)?;
    let harmed_share = checked_sub(deal.seller_bond, treasury_share)?;
    Ok(Distribution {
        buyer_principal_refund: deal.principal,
        seller_principal: 0,
        buyer_bond_refund: deal.buyer_bond,
        seller_bond_refund: 0,
        buyer_bond_to_seller: 0,
        buyer_bond_to_treasury: 0,
        seller_bond_to_buyer: harmed_share,
        seller_bond_to_treasury: treasury_share,
        success_fee_to_treasury: 0,
    })
}

fn buyer_breach_distribution(deal: &Deal) -> Result<Distribution, ContractError> {
    let treasury_share = bps_share(deal.buyer_bond, deal.buyer_breach_treasury_bps)?;
    let harmed_share = checked_sub(deal.buyer_bond, treasury_share)?;
    Ok(Distribution {
        buyer_principal_refund: 0,
        seller_principal: deal.principal,
        buyer_bond_refund: 0,
        seller_bond_refund: deal.seller_bond,
        buyer_bond_to_seller: harmed_share,
        buyer_bond_to_treasury: treasury_share,
        seller_bond_to_buyer: 0,
        seller_bond_to_treasury: 0,
        success_fee_to_treasury: 0,
    })
}

fn mutual_cancellation_distribution(deal: &Deal) -> Distribution {
    Distribution {
        buyer_principal_refund: deal.principal,
        seller_principal: 0,
        buyer_bond_refund: deal.buyer_bond,
        seller_bond_refund: deal.seller_bond,
        buyer_bond_to_seller: 0,
        buyer_bond_to_treasury: 0,
        seller_bond_to_buyer: 0,
        seller_bond_to_treasury: 0,
        success_fee_to_treasury: 0,
    }
}

fn settle_success(env: &Env, deal_id: &BytesN<32>, deal: &mut Deal) -> Result<(), ContractError> {
    let distribution = success_distribution(deal)?;
    apply_terminal_distribution(
        env,
        deal_id,
        deal,
        distribution,
        DealState::SettledSuccess,
        TerminalOutcome::SettledSuccess,
    )
}

fn settle_seller_breach(
    env: &Env,
    deal_id: &BytesN<32>,
    deal: &mut Deal,
) -> Result<(), ContractError> {
    let distribution = seller_breach_distribution(deal)?;
    apply_terminal_distribution(
        env,
        deal_id,
        deal,
        distribution,
        DealState::SellerBreach,
        TerminalOutcome::SellerBreach,
    )
}

fn settle_buyer_breach(
    env: &Env,
    deal_id: &BytesN<32>,
    deal: &mut Deal,
) -> Result<(), ContractError> {
    let distribution = buyer_breach_distribution(deal)?;
    apply_terminal_distribution(
        env,
        deal_id,
        deal,
        distribution,
        DealState::BuyerBreach,
        TerminalOutcome::BuyerBreach,
    )
}

fn settle_mutual_cancellation(
    env: &Env,
    deal_id: &BytesN<32>,
    deal: &mut Deal,
) -> Result<(), ContractError> {
    let distribution = mutual_cancellation_distribution(deal);
    apply_terminal_distribution(
        env,
        deal_id,
        deal,
        distribution,
        DealState::MutualCancellation,
        TerminalOutcome::MutualCancellation,
    )
}

fn apply_terminal_distribution(
    env: &Env,
    deal_id: &BytesN<32>,
    deal: &mut Deal,
    distribution: Distribution,
    terminal_state: DealState,
    terminal_outcome: TerminalOutcome,
) -> Result<(), ContractError> {
    let expected_locked = checked_sum(&[deal.principal, deal.buyer_bond, deal.seller_bond])?;
    let total_out = checked_sum(&[
        distribution.buyer_principal_refund,
        distribution.seller_principal,
        distribution.buyer_bond_refund,
        distribution.seller_bond_refund,
        distribution.buyer_bond_to_seller,
        distribution.buyer_bond_to_treasury,
        distribution.seller_bond_to_buyer,
        distribution.seller_bond_to_treasury,
        distribution.success_fee_to_treasury,
    ])?;
    if expected_locked != total_out {
        return Err(ContractError::AmountOverflow);
    }

    transfer_if_positive(
        env,
        &deal.buyer,
        distribution.buyer_principal_refund,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.seller,
        distribution.seller_principal,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.buyer,
        distribution.buyer_bond_refund,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.seller,
        distribution.seller_bond_refund,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.seller,
        distribution.buyer_bond_to_seller,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.treasury,
        distribution.buyer_bond_to_treasury,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.buyer,
        distribution.seller_bond_to_buyer,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.treasury,
        distribution.seller_bond_to_treasury,
        &deal.accepted_asset,
    )?;
    transfer_if_positive(
        env,
        &deal.treasury,
        distribution.success_fee_to_treasury,
        &deal.accepted_asset,
    )?;

    let previous_state = deal.state.clone();
    deal.state = terminal_state.clone();
    deal.terminal_outcome = terminal_outcome.clone();
    deal.last_updated_ledger_timestamp = env.ledger().timestamp();
    write_deal(env, deal)?;
    SettlementDistributionEvent {
        deal_id: deal_id.clone(),
        outcome: terminal_outcome,
        buyer_principal_refund: distribution.buyer_principal_refund,
        seller_principal: distribution.seller_principal,
        buyer_bond_refund: distribution.buyer_bond_refund,
        seller_bond_refund: distribution.seller_bond_refund,
        buyer_bond_to_seller: distribution.buyer_bond_to_seller,
        buyer_bond_to_treasury: distribution.buyer_bond_to_treasury,
        seller_bond_to_buyer: distribution.seller_bond_to_buyer,
        seller_bond_to_treasury: distribution.seller_bond_to_treasury,
        success_fee_to_treasury: distribution.success_fee_to_treasury,
    }
    .publish(env);
    publish_state_change(env, deal_id, previous_state, terminal_state);
    Ok(())
}

fn transfer_if_positive(
    env: &Env,
    to: &Address,
    amount: i128,
    asset: &Address,
) -> Result<(), ContractError> {
    if amount > 0 {
        transfer_from_contract(env, to, amount, asset)?;
    }
    Ok(())
}

fn transfer_to_contract(
    env: &Env,
    from: &Address,
    amount: i128,
    asset: &Address,
) -> Result<(), ContractError> {
    let token_client = token::TokenClient::new(env, asset);
    token_client.transfer(from, env.current_contract_address(), &amount);
    Ok(())
}

fn transfer_from_contract(
    env: &Env,
    to: &Address,
    amount: i128,
    asset: &Address,
) -> Result<(), ContractError> {
    let token_client = token::TokenClient::new(env, asset);
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
