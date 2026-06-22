import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReputationPageClient } from './ReputationPageClient';
import {
  filterReputationRecords,
  reputationRecords,
} from './reputation-page-model';

describe('ReputationPageClient', () => {
  it('renders the reputation summary and transaction records', () => {
    const html = renderToString(
      <ReputationPageClient userId="seller-probolinggo-cabai" />,
    );

    expect(html).toContain('Reputation');
    expect(html).toContain('Successful Deals');
    expect(html).toContain('Failed Deals');
    expect(html).toContain('Total Verified Tx');
    expect(html.match(/View on Stellar/g)).toHaveLength(4);
  });

  it('filters failed outcomes without requesting backend data', () => {
    const failedRecords = filterReputationRecords({
      records: reputationRecords,
      statusFilter: 'failed',
      roleFilter: 'all',
      query: '',
    });

    expect(failedRecords).toHaveLength(1);
    expect(failedRecords[0]?.failureReason).toBe('Missed funding deadline');
  });

  it('searches records by counterparty', () => {
    const matchingRecords = filterReputationRecords({
      records: reputationRecords,
      statusFilter: 'all',
      roleFilter: 'all',
      query: 'Java Roastery',
    });

    expect(matchingRecords).toHaveLength(1);
    expect(matchingRecords[0]?.counterparty).toBe('Java Roastery Supply Co.');
  });
});
