import { describe, expect, it } from 'vitest';
import {
  getNextFocusIndex,
  isEscapeDismissKey,
  isMarketplaceOpenKey,
} from './landing-interactions';

describe('landing interaction helpers', () => {
  it('recognizes the keyboard keys that open the marketplace dropdown', () => {
    expect(isMarketplaceOpenKey('Enter')).toBe(true);
    expect(isMarketplaceOpenKey(' ')).toBe(true);
    expect(isMarketplaceOpenKey('ArrowDown')).toBe(true);
    expect(isMarketplaceOpenKey('Tab')).toBe(false);
  });

  it('recognizes Escape as a dismiss key', () => {
    expect(isEscapeDismissKey('Escape')).toBe(true);
    expect(isEscapeDismissKey('Enter')).toBe(false);
  });

  it('cycles focus within the modal when tabbing forward or backward', () => {
    expect(getNextFocusIndex(-1, 3, false)).toBe(0);
    expect(getNextFocusIndex(0, 3, true)).toBe(2);
    expect(getNextFocusIndex(2, 3, false)).toBe(0);
    expect(getNextFocusIndex(1, 3, true)).toBe(0);
  });
});
