import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('renders COMPLETED as the canonical terminal success label', () => {
    const html = renderToString(<StatusPill status="COMPLETED" />);

    expect(html).toContain('Settled');
    expect(html).not.toContain('Accepted');
  });

  it('falls back to unknown status text without reintroducing stale success vocabulary', () => {
    const html = renderToString(<StatusPill status="CUSTOM_STATUS" />);

    expect(html).toContain('CUSTOM_STATUS');
    expect(html).not.toContain('Accepted');
  });
});
