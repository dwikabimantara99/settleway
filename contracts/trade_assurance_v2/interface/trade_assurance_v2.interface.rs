#[soroban_sdk::contractargs(name = "Args")]
#[soroban_sdk::contractclient(name = "Client")]
pub trait Contract {
    fn get_deal(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
    ) -> Result<Deal, ContractError>;
    fn get_state(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
    ) -> Result<DealState, ContractError>;
    fn fund_buyer(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
        buyer: soroban_sdk::Address,
    ) -> Result<(), ContractError>;
    fn get_config(env: soroban_sdk::Env) -> Result<Config, ContractError>;
    fn initialize(
        env: soroban_sdk::Env,
        initializer: soroban_sdk::Address,
        accepted_asset: soroban_sdk::Address,
        policy_version: u32,
    ) -> Result<(), ContractError>;
    fn create_deal(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
        creator: soroban_sdk::Address,
        buyer: soroban_sdk::Address,
        seller: soroban_sdk::Address,
        terms_hash: soroban_sdk::BytesN<32>,
        principal: i128,
        buyer_bond: i128,
        seller_bond: i128,
        funding_deadline: u64,
        delivery_deadline: u64,
        inspection_deadline: u64,
    ) -> Result<(), ContractError>;
    fn deal_exists(env: soroban_sdk::Env, deal_id: soroban_sdk::BytesN<32>) -> bool;
    fn fund_seller(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
        seller: soroban_sdk::Address,
    ) -> Result<(), ContractError>;
    fn accept_terms(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
        participant: soroban_sdk::Address,
    ) -> Result<(), ContractError>;
    fn contract_info(env: soroban_sdk::Env) -> Result<ContractInfo, ContractError>;
    fn expire_funding(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
    ) -> Result<(), ContractError>;
    fn accept_delivery(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
        buyer: soroban_sdk::Address,
    ) -> Result<(), ContractError>;
    fn submit_evidence(
        env: soroban_sdk::Env,
        deal_id: soroban_sdk::BytesN<32>,
        seller: soroban_sdk::Address,
        evidence_hash: soroban_sdk::BytesN<32>,
    ) -> Result<(), ContractError>;
}
#[soroban_sdk::contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct Deal {
    pub buyer: soroban_sdk::Address,
    pub buyer_bond: i128,
    pub buyer_funded: bool,
    pub buyer_terms_accepted: bool,
    pub created_ledger_timestamp: u64,
    pub creator: soroban_sdk::Address,
    pub deal_id: soroban_sdk::BytesN<32>,
    pub delivery_deadline: u64,
    pub evidence_commitment: Option<soroban_sdk::BytesN<32>>,
    pub funding_deadline: u64,
    pub inspection_deadline: u64,
    pub last_updated_ledger_timestamp: u64,
    pub policy_version: u32,
    pub principal: i128,
    pub seller: soroban_sdk::Address,
    pub seller_bond: i128,
    pub seller_funded: bool,
    pub seller_terms_accepted: bool,
    pub state: DealState,
    pub terminal_outcome: TerminalOutcome,
    pub terms_hash: soroban_sdk::BytesN<32>,
}
#[soroban_sdk::contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct Config {
    pub accepted_asset: soroban_sdk::Address,
    pub initialized: bool,
    pub interface_version: u32,
    pub policy_version: u32,
}
#[soroban_sdk::contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct ContractInfo {
    pub interface_version: u32,
    pub name: soroban_sdk::String,
    pub policy_version: u32,
}
#[soroban_sdk::contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum DataKey {
    Config,
    Deal(soroban_sdk::BytesN<32>),
}
#[soroban_sdk::contracttype(export = false)]
#[derive(Debug, Copy, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum DealState {
    TermsPending = 0,
    AwaitingFunding = 1,
    Active = 2,
    EvidenceSubmitted = 3,
    SettledSuccess = 4,
    FundingExpired = 5,
}
#[soroban_sdk::contracttype(export = false)]
#[derive(Debug, Copy, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum TerminalOutcome {
    None = 0,
    SettledSuccess = 1,
    FundingExpired = 2,
}
#[soroban_sdk::contracterror(export = false)]
#[derive(Debug, Copy, Clone, Eq, PartialEq, Ord, PartialOrd)]
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
#[soroban_sdk::contractevent(export = false, topics = ["bfund"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct BuyerFundedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    pub participant: soroban_sdk::Address,
    pub amount: i128,
    pub buyer_funded: bool,
    pub seller_funded: bool,
}
#[soroban_sdk::contractevent(export = false, topics = ["deal"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct DealCreatedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    pub buyer: soroban_sdk::Address,
    pub seller: soroban_sdk::Address,
    pub principal: i128,
    pub buyer_bond: i128,
    pub seller_bond: i128,
}
#[soroban_sdk::contractevent(export = false, topics = ["init"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct InitializedEvent {
    #[topic]
    pub asset: soroban_sdk::Address,
    pub initializer: soroban_sdk::Address,
    pub policy_version: u32,
    pub interface_version: u32,
}
#[soroban_sdk::contractevent(export = false, topics = ["sfund"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct SellerFundedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    pub participant: soroban_sdk::Address,
    pub amount: i128,
    pub buyer_funded: bool,
    pub seller_funded: bool,
}
#[soroban_sdk::contractevent(export = false, topics = ["state"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct StateChangedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    pub from: DealState,
    pub to: DealState,
    pub timestamp: u64,
}
#[soroban_sdk::contractevent(export = false, topics = ["active"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct DealActivatedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
}
#[soroban_sdk::contractevent(export = false, topics = ["accept"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct TermsAcceptedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    #[topic]
    pub participant: soroban_sdk::Address,
}
#[soroban_sdk::contractevent(export = false, topics = ["expired"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct FundingExpiredEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    pub buyer_funded: bool,
    pub seller_funded: bool,
    pub buyer_refund: i128,
    pub seller_refund: i128,
}
#[soroban_sdk::contractevent(export = false, topics = ["evidence"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct EvidenceSubmittedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    pub evidence_hash: soroban_sdk::BytesN<32>,
}
#[soroban_sdk::contractevent(export = false, topics = ["settled"])]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct SettlementCompletedEvent {
    #[topic]
    pub deal_id: soroban_sdk::BytesN<32>,
    pub seller_principal: i128,
    pub buyer_bond_refund: i128,
    pub seller_bond_refund: i128,
}

