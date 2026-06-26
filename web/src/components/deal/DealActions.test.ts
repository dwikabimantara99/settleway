import { describe, expect, it } from 'vitest';
import { getCustodyV2Action } from './DealActions';

describe('Custody V2 DealActions sequencing', () => {
  it('starts with buyer Create on Stellar and then seller Accept terms on Stellar', () => {
    expect(
      getCustodyV2Action({
        state: 'TermsPending',
        viewerRole: 'buyer',
        confirmedActions: [],
      }),
    ).toEqual({ actionType: 'CREATE_DEAL', label: 'Create on Stellar' });

    expect(
      getCustodyV2Action({
        state: 'TermsPending',
        viewerRole: 'seller',
        confirmedActions: [],
      }),
    ).toBeNull();

    expect(
      getCustodyV2Action({
        state: 'TermsPending',
        viewerRole: 'seller',
        confirmedActions: ['CREATE_DEAL'],
      }),
    ).toEqual({ actionType: 'ACCEPT_TERMS', label: 'Accept terms on Stellar' });
  });
});
