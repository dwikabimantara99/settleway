export type CustodyV2WalletRole =
  | 'buyer'
  | 'seller'
  | 'unmatched'
  | 'disconnected';

export interface ResolveCustodyV2WalletRoleInput {
  connectedWalletAddress: string | null | undefined;
  buyerAddress: string;
  sellerAddress: string;
}

export interface CustodyV2WalletRoleResolution {
  role: CustodyV2WalletRole;
  canCreateDeal: boolean;
  canAcceptTerms: boolean;
  canUseFinancialActions: boolean;
  explanation: string;
}

function normalizeAddress(address: string | null | undefined): string | null {
  const trimmed = typeof address === 'string' ? address.trim() : '';
  return trimmed ? trimmed.toUpperCase() : null;
}

export function resolveCustodyV2WalletRole(
  input: ResolveCustodyV2WalletRoleInput,
): CustodyV2WalletRoleResolution {
  const connected = normalizeAddress(input.connectedWalletAddress);
  const buyer = normalizeAddress(input.buyerAddress);
  const seller = normalizeAddress(input.sellerAddress);

  if (!connected) {
    return {
      role: 'disconnected',
      canCreateDeal: false,
      canAcceptTerms: false,
      canUseFinancialActions: false,
      explanation: 'Connect the wallet that is bound to this deal before using Stellar actions.',
    };
  }

  if (connected === buyer) {
    return {
      role: 'buyer',
      canCreateDeal: true,
      canAcceptTerms: false,
      canUseFinancialActions: true,
      explanation: 'Connected wallet matches the immutable buyer address for this deal.',
    };
  }

  if (connected === seller) {
    return {
      role: 'seller',
      canCreateDeal: false,
      canAcceptTerms: true,
      canUseFinancialActions: true,
      explanation: 'Connected wallet matches the immutable seller address for this deal.',
    };
  }

  return {
    role: 'unmatched',
    canCreateDeal: false,
    canAcceptTerms: false,
    canUseFinancialActions: false,
    explanation: 'This wallet is not the buyer or seller wallet bound to this deal.',
  };
}
