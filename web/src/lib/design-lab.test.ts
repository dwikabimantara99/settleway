import { describe, expect, it } from 'vitest';
import { isDesignLabEnabled } from './design-lab';

describe('design lab production guard', () => {
  it('is unavailable in production', () => {
    expect(isDesignLabEnabled('production')).toBe(false);
  });

  it('remains available for development verification', () => {
    expect(isDesignLabEnabled('development')).toBe(true);
    expect(isDesignLabEnabled('test')).toBe(true);
  });
});
