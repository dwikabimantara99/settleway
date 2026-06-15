import { describe, it, expect, beforeEach } from 'vitest';
import { MockStore } from './mock-store';
import { DbEvidenceFile } from './types';

describe('MockStore - Evidence', () => {
  let store: MockStore;

  beforeEach(() => {
    store = new MockStore();
    store.evidenceFiles.clear();
  });

  const createTestEvidence = (id: string, dealId: string): DbEvidenceFile => ({
    id,
    deal_id: dealId,
    submitted_by: 'seller-1',
    evidence_kind: 'delivery_photo',
    original_filename: 'photo.jpg',
    mime_type: 'image/jpeg',
    byte_size: 1024,
    sha256_hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    display_visibility: 'deal_only',
    chain_operation_reference: null,
    created_at: new Date().toISOString()
  });

  it('creates and retrieves evidence metadata', () => {
    const ev = createTestEvidence('ev-1', 'deal-1');
    store.addEvidence(ev);

    const retrieved = store.getEvidence('ev-1');
    expect(retrieved).toEqual(ev);
    
    // Test 5: does not expose or persist raw evidence bytes (only metadata exists on type)
    expect('bytes' in retrieved!).toBe(false);
    expect('file' in retrieved!).toBe(false);
  });

  it('lists evidence only for the correct deal', () => {
    store.addEvidence(createTestEvidence('ev-1', 'deal-1'));
    store.addEvidence(createTestEvidence('ev-2', 'deal-2'));
    store.addEvidence(createTestEvidence('ev-3', 'deal-1'));

    const deal1Evidence = store.getDealEvidence('deal-1');
    expect(deal1Evidence.length).toBe(2);
    expect(deal1Evidence.map(e => e.id).sort()).toEqual(['ev-1', 'ev-3']);

    const deal2Evidence = store.getDealEvidence('deal-2');
    expect(deal2Evidence.length).toBe(1);
    expect(deal2Evidence[0].id).toBe('ev-2');
  });

  it('preserves multiple evidence records as append-only entries', () => {
    store.addEvidence(createTestEvidence('ev-1', 'deal-1'));
    store.addEvidence(createTestEvidence('ev-2', 'deal-1'));
    
    const records = store.getDealEvidence('deal-1');
    expect(records.length).toBe(2);
  });

  it('rejects or safely handles duplicate evidence IDs', () => {
    const ev = createTestEvidence('ev-1', 'deal-1');
    store.addEvidence(ev);
    
    expect(() => store.addEvidence(ev)).toThrow('Evidence record already exists');
  });

  it('prevents silent overwrite', () => {
    const ev1 = createTestEvidence('ev-1', 'deal-1');
    store.addEvidence(ev1);
    
    const ev1Modified = { ...ev1, original_filename: 'hacked.jpg' };
    expect(() => store.addEvidence(ev1Modified)).toThrow('Evidence record already exists');
    
    // Ensure original is intact
    const retrieved = store.getEvidence('ev-1');
    expect(retrieved?.original_filename).toBe('photo.jpg');
  });

  it('isolates returned data from accidental external mutation', () => {
    const ev = createTestEvidence('ev-1', 'deal-1');
    store.addEvidence(ev);
    
    const retrieved1 = store.getEvidence('ev-1');
    expect(retrieved1).not.toBeNull();
    
    // Mutate retrieved object
    retrieved1!.original_filename = 'mutated.jpg';
    
    // Fetch again, should not be mutated
    const retrieved2 = store.getEvidence('ev-1');
    expect(retrieved2?.original_filename).toBe('photo.jpg');
  });
});
