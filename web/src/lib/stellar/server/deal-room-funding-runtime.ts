import type { DbDeal } from "@/lib/db/types";
import type { DealStatus } from "@/lib/escrow/state-machine";
import { resolveStellarActionPlan } from "./action-policy";
import type { StellarSignerRole } from "./action-policy";
import type { StellarExecutionPublicMetadata } from "./execution-input-assembler";
import { TESTNET_DEMO_IDENTITIES } from "../testnet-demo-identities";

export type DealRoomFundingAction = "buyer_deposit" | "seller_deposit" | "buyer_deposit_custody" | "seller_deposit_custody";
export type DealRoomFundingParticipantRole = "buyer" | "seller";
export type DealRoomFundingWalletRole =
  | DealRoomFundingParticipantRole
  | "platform";

export interface DealRoomFundingWallet {
  role: DealRoomFundingWalletRole;
  signer_role: StellarSignerRole;
  identity_alias: string;
  public_address: string;
}

export interface DealRoomFundingIntent {
  action: DealRoomFundingAction;
  participant_role: DealRoomFundingParticipantRole;
  counterparty_role: DealRoomFundingParticipantRole;
  signer_role: StellarSignerRole;
  actor_address: string;
  commitment_idr: number;
  expected_local_status: DealStatus;
  target_local_status: DealStatus;
  commercial_value_idr: number;
}

export interface DealRoomFundingPublicProof {
  network_label: "Stellar Testnet";
  contract_id: string;
  actor_address: string;
  buyer_demo_address: string;
  seller_demo_address: string;
  platform_admin_address: string;
  funding_action: DealRoomFundingAction;
  commitment_idr: number;
  target_local_status: DealStatus;
  status_note: string;
}

export interface DealRoomFundingRuntimeContext {
  metadata: StellarExecutionPublicMetadata;
  role_wallets: Record<DealRoomFundingWalletRole, DealRoomFundingWallet>;
  funding_intent: DealRoomFundingIntent;
  public_proof: DealRoomFundingPublicProof;
}

export type DealRoomFundingRuntimeError =
  | {
      ok: false;
      error_code: "ERR_INVALID_CONTRACT_ID";
      field: "contract_id";
    }
  | {
      ok: false;
      error_code: "ERR_CONTRACT_ID_CONFLICT";
    }
  | {
      ok: false;
      error_code: "ERR_ACTION_POLICY_MISMATCH";
    };

export type DealRoomFundingRuntimeResult =
  | {
      ok: true;
      context: DealRoomFundingRuntimeContext;
    }
  | DealRoomFundingRuntimeError;

const ROLE_WALLETS: Record<DealRoomFundingWalletRole, DealRoomFundingWallet> = {
  buyer: {
    role: "buyer",
    signer_role: "buyer_demo",
    identity_alias: TESTNET_DEMO_IDENTITIES.buyer.identity_alias,
    public_address: TESTNET_DEMO_IDENTITIES.buyer.public_address,
  },
  seller: {
    role: "seller",
    signer_role: "seller_demo",
    identity_alias: TESTNET_DEMO_IDENTITIES.seller.identity_alias,
    public_address: TESTNET_DEMO_IDENTITIES.seller.public_address,
  },
  platform: {
    role: "platform",
    signer_role: "admin",
    identity_alias: TESTNET_DEMO_IDENTITIES.platform.identity_alias,
    public_address: TESTNET_DEMO_IDENTITIES.platform.public_address,
  },
};

function isValidContractId(contractId: string): boolean {
  return contractId !== "" && contractId.trim() === contractId;
}

function resolveParticipantRole(
  action: DealRoomFundingAction,
): DealRoomFundingParticipantRole {
  return action === "buyer_deposit" || action === "buyer_deposit_custody" ? "buyer" : "seller";
}

function resolveCounterpartyRole(
  role: DealRoomFundingParticipantRole,
): DealRoomFundingParticipantRole {
  return role === "buyer" ? "seller" : "buyer";
}

function resolveCommitmentIdr(
  deal: DbDeal,
  role: DealRoomFundingParticipantRole,
): number {
  return role === "buyer" ? deal.buyer_total_idr : deal.seller_total_idr;
}

export function buildDealRoomExecutionMetadata(
  contractId: string,
  buyerAddress?: string,
  sellerAddress?: string,
  adminAddress?: string,
  tokenAddress?: string,
  feeRecipient?: string,
): StellarExecutionPublicMetadata {
  return {
    contract_id: contractId,
    admin_address: adminAddress ?? ROLE_WALLETS.platform.public_address,
    buyer_demo_address: buyerAddress ?? ROLE_WALLETS.buyer.public_address,
    seller_demo_address: sellerAddress ?? ROLE_WALLETS.seller.public_address,
    token_address: tokenAddress,
    fee_recipient: feeRecipient,
  };
}

export function composeDealRoomFundingRuntime(input: {
  deal: DbDeal;
  action: DealRoomFundingAction;
  contract_id: string;
  buyer_address?: string;
  seller_address?: string;
}): DealRoomFundingRuntimeResult {
  if (!isValidContractId(input.contract_id)) {
    return {
      ok: false,
      error_code: "ERR_INVALID_CONTRACT_ID",
      field: "contract_id",
    };
  }

  if (
    input.deal.stellar_contract_id !== null &&
    input.deal.stellar_contract_id !== input.contract_id
  ) {
    return {
      ok: false,
      error_code: "ERR_CONTRACT_ID_CONFLICT",
    };
  }

  const planResult = resolveStellarActionPlan(input.action, input.deal.status);
  if (!planResult.ok) {
    return {
      ok: false,
      error_code: "ERR_ACTION_POLICY_MISMATCH",
    };
  }

  const participantRole = resolveParticipantRole(input.action);
  const counterpartyRole = resolveCounterpartyRole(participantRole);
  
  const roleWallets = { ...ROLE_WALLETS };
  if (input.buyer_address) {
    roleWallets.buyer = { ...roleWallets.buyer, public_address: input.buyer_address };
  }
  if (input.seller_address) {
    roleWallets.seller = { ...roleWallets.seller, public_address: input.seller_address };
  }
  
  const actorWallet = roleWallets[participantRole];

  if (planResult.plan.signer_role !== actorWallet.signer_role) {
    return {
      ok: false,
      error_code: "ERR_ACTION_POLICY_MISMATCH",
    };
  }

  const commitmentIdr = resolveCommitmentIdr(input.deal, participantRole);
  const metadata = buildDealRoomExecutionMetadata(input.contract_id, input.buyer_address, input.seller_address);

  const statusNote =
    planResult.plan.target_local_status === "LOCKED"
      ? "This second funding confirmation should move the room into protected lock."
      : "Counterparty funding is still required before the protected lock can begin.";

  return {
    ok: true,
    context: {
      metadata,
      role_wallets: roleWallets,
      funding_intent: {
        action: input.action,
        participant_role: participantRole,
        counterparty_role: counterpartyRole,
        signer_role: planResult.plan.signer_role,
        actor_address: actorWallet.public_address,
        commitment_idr: commitmentIdr,
        expected_local_status: planResult.plan.expected_local_status as DealStatus,
        target_local_status: planResult.plan.target_local_status,
        commercial_value_idr: input.deal.principal_idr,
      },
      public_proof: {
        network_label: "Stellar Testnet",
        contract_id: metadata.contract_id,
        actor_address: actorWallet.public_address,
        buyer_demo_address: metadata.buyer_demo_address,
        seller_demo_address: metadata.seller_demo_address,
        platform_admin_address: metadata.admin_address,
        funding_action: input.action,
        commitment_idr: commitmentIdr,
        target_local_status: planResult.plan.target_local_status,
        status_note: statusNote,
      },
    },
  };
}
