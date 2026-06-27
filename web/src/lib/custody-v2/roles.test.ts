import { describe, expect, it } from 'vitest';
import { resolveCustodyV2WalletRole } from './roles';

const buyerAddress = 'GBUYERADDRESSFORTEST';
const sellerAddress = 'GSELLERADDRESSFORTEST';

describe('Custody V2 wallet role resolver', () => {
  it('does not infer a financial role without a connected wallet', () => {
    expect(resolveCustodyV2WalletRole({
      connectedWalletAddress: null,
      buyerAddress,
      sellerAddress,
    })).toMatchObject({
      role: 'disconnected',
      canCreateDeal: false,
      canAcceptTerms: false,
      canUseFinancialActions: false,
    });
  });

  it('resolves buyer and seller only from immutable deal addresses', () => {
    expect(resolveCustodyV2WalletRole({
      connectedWalletAddress: buyerAddress.toLowerCase(),
      buyerAddress,
      sellerAddress,
    })).toMatchObject({
      role: 'buyer',
      canCreateDeal: true,
      canAcceptTerms: false,
    });

    expect(resolveCustodyV2WalletRole({
      connectedWalletAddress: sellerAddress,
      buyerAddress,
      sellerAddress,
    })).toMatchObject({
      role: 'seller',
      canCreateDeal: false,
      canAcceptTerms: true,
    });
  });

  it('keeps unmatched wallets read-only regardless of navigation mode or mock actor', () => {
    expect(resolveCustodyV2WalletRole({
      connectedWalletAddress: 'GOTHERADDRESSFORTEST',
      buyerAddress,
      sellerAddress,
    })).toMatchObject({
      role: 'unmatched',
      canCreateDeal: false,
      canAcceptTerms: false,
      canUseFinancialActions: false,
    });
  });
});
