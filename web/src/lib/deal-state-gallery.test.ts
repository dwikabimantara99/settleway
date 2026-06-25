import { describe, expect, it } from 'vitest';
import {
  DEAL_STATE_GALLERY_STATUSES,
  buildDealStateGalleryFixtures,
  getDealStateGalleryFixtureId,
  isDealStateGalleryEnabled,
} from './deal-state-gallery';

describe('deal state gallery fixtures', () => {
  it('is unavailable in production', () => {
    expect(isDealStateGalleryEnabled('production')).toBe(false);
    expect(isDealStateGalleryEnabled('development')).toBe(true);
    expect(isDealStateGalleryEnabled('test')).toBe(true);
  });

  it('defines one deterministic fixture for every Deal Room state', () => {
    const fixtures = buildDealStateGalleryFixtures();

    expect(fixtures).toHaveLength(DEAL_STATE_GALLERY_STATUSES.length);
    expect(fixtures.map((fixture) => fixture.status)).toEqual(DEAL_STATE_GALLERY_STATUSES);

    for (const fixture of fixtures) {
      expect(fixture.deal.id).toBe(getDealStateGalleryFixtureId(fixture.status));
      expect(fixture.deal.status).toBe(fixture.status);
      expect(fixture.offer.active_deal_id).toBe(fixture.deal.id);
      expect(fixture.events[0]?.metadata.fixture_kind).toBe('development_visual_state_gallery');
    }
  });
});
