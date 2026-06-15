import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyAndConstructEvidence, EvidenceInputMetadata } from './verification';

describe('Evidence Verification Service', () => {
  const eventIdGenerator = () => 'ev-1';

  const validMetadata: EvidenceInputMetadata = {
    deal_id: 'deal-1',
    submitted_by: 'user-1',
    evidence_kind: 'delivery_photo',
    original_filename: 'photo.jpg',
    mime_type: 'image/jpeg',
    display_visibility: 'deal_only'
  };

  const payloadString = 'hello world';
  const payloadBuffer = Buffer.from(payloadString, 'utf-8');
  const payloadHash = crypto.createHash('sha256').update(payloadBuffer).digest('hex').toLowerCase();

  it('computes correct server-authoritative hash and constructs canonical metadata', async () => {
    const result = await verifyAndConstructEvidence(validMetadata, payloadBuffer, eventIdGenerator);
    
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.evidence).toBeDefined();

    const ev = result.evidence!;
    expect(ev.id).toBe('ev-1');
    expect(ev.deal_id).toBe('deal-1');
    expect(ev.submitted_by).toBe('user-1');
    expect(ev.byte_size).toBe(payloadBuffer.length);
    expect(ev.sha256_hash).toBe(payloadHash);
    
    // Ensures raw bytes are not included in the output evidence
    expect((ev as Record<string, unknown>).bytes).toBeUndefined();
    expect((ev as Record<string, unknown>).buffer).toBeUndefined();
  });

  it('accepts valid client preview hash', async () => {
    const metadata = { ...validMetadata, client_preview_hash: payloadHash };
    const result = await verifyAndConstructEvidence(metadata, payloadBuffer, eventIdGenerator);
    
    expect(result.ok).toBe(true);
    expect(result.evidence?.sha256_hash).toBe(payloadHash);
  });

  it('rejects mismatched client preview hash', async () => {
    const badHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    const metadata = { ...validMetadata, client_preview_hash: badHash };
    const result = await verifyAndConstructEvidence(metadata, payloadBuffer, eventIdGenerator);
    
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/mismatch/i);
    expect(result.evidence).toBeUndefined();
  });

  it('rejects empty payload', async () => {
    const emptyPayload = Buffer.from('');
    const res = await verifyAndConstructEvidence(validMetadata, emptyPayload, () => 'evt-5');
    
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Payload is empty');
  });

  it('accepts exactly 10 MiB payload', async () => {
    const payload = Buffer.alloc(10 * 1024 * 1024);
    const res = await verifyAndConstructEvidence(validMetadata, payload, () => 'evt-6');
    
    expect(res.ok).toBe(true);
    expect(res.evidence!.byte_size).toBe(10 * 1024 * 1024);
  });

  it('accepts one byte below 10 MiB limit', async () => {
    const payload = Buffer.alloc(10 * 1024 * 1024 - 1);
    const res = await verifyAndConstructEvidence(validMetadata, payload, () => 'evt-7');
    
    expect(res.ok).toBe(true);
    expect(res.evidence!.byte_size).toBe(10 * 1024 * 1024 - 1);
  });

  it('rejects one byte above 10 MiB limit', async () => {
    const payload = Buffer.alloc(10 * 1024 * 1024 + 1);
    const res = await verifyAndConstructEvidence(validMetadata, payload, () => 'evt-8');
    
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Payload exceeds maximum allowed size');
  });

  it('rejects missing metadata', async () => {
    const badMeta = { ...validMetadata, original_filename: '' };
    const result = await verifyAndConstructEvidence(badMeta, payloadBuffer, eventIdGenerator);
    
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Missing required/i);
  });
});
