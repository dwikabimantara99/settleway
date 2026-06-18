import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PayoutDestinationCard } from './PayoutDestinationCard';

describe('PayoutDestinationCard', () => {
  it('renders active wallet destination and honest bank placeholder copy', () => {
    const markup = renderToStaticMarkup(
      <PayoutDestinationCard
        profileId="buyer-surabaya-restaurant"
        canEdit={false}
        initialWalletLabel="Procurement treasury wallet"
        initialWalletAddress="GBL7R3X4YTF7Q7M6M2J3QK7A4ZJ5V8L2P6N4R9T2C7Y5M3W6K8A1B2CD"
        initialBankName="Bank settlement rail"
        initialBankAccountMasked="Not live in MVP"
      />,
    );

    expect(markup).toContain('Payout Destination');
    expect(markup).toContain('Linked wallet destination');
    expect(markup).toContain('Procurement treasury wallet');
    expect(markup).toContain('Local bank payout');
    expect(markup).toContain('Not live');
    expect(markup).toContain('Only the profile owner can update payout destination preferences.');
  });
});
