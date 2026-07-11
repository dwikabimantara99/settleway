import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import FundingPage from './page';

describe('FundingPage', () => {
  it('renders funding opportunities without full payment logic', () => {
    const html = renderToString(<FundingPage />);

    expect(html).toContain('Funding Opportunities');
    expect(html).toContain('Probolinggo Chili Expansion');
    expect(html).toContain('Applicant: Probolinggo Chili Cooperative');
    expect(html).toContain('Testnet Hackathon Preview');
    expect(html).toContain('View Opportunity');
    expect(html).toContain('Join Funding Waitlist');
    expect(html).not.toContain('Invest Now');
  });
});
