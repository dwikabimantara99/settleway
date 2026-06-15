import crypto from 'crypto';
import { DbEvidenceFile } from '../db/types';

export interface EvidenceInputMetadata {
  deal_id: string;
  submitted_by: string;
  evidence_kind: string;
  original_filename: string;
  mime_type: string;
  display_visibility: 'public' | 'private' | 'deal_only';
  client_preview_hash?: string;
}

export interface EvidenceVerificationResult {
  ok: boolean;
  error?: string;
  evidence?: DbEvidenceFile;
}

export async function verifyAndConstructEvidence(
  metadata: EvidenceInputMetadata,
  payload: Buffer | Uint8Array | ArrayBuffer,
  eventIdGenerator: () => string
): Promise<EvidenceVerificationResult> {
  if (!metadata || !payload) {
    return { ok: false, error: 'Missing input' };
  }

  // Validate metadata
  if (!metadata.deal_id || !metadata.submitted_by || !metadata.original_filename || !metadata.evidence_kind || !metadata.mime_type || !metadata.display_visibility) {
    return { ok: false, error: 'Missing required metadata fields' };
  }

  // Convert payload to Buffer
  const buffer = Buffer.isBuffer(payload) 
    ? payload 
    : Buffer.from(payload instanceof ArrayBuffer ? payload : payload.buffer);

  // Validate size
  if (buffer.length === 0) {
    return { ok: false, error: 'Payload is empty' };
  }
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB
  if (buffer.length > MAX_SIZE_BYTES) {
    return { ok: false, error: 'Payload exceeds maximum allowed size' };
  }

  // Compute server-authoritative SHA-256 hash
  const serverHash = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();

  // Compare with client preview hash if provided
  if (metadata.client_preview_hash) {
    const clientHashNormalized = metadata.client_preview_hash.toLowerCase();
    if (serverHash !== clientHashNormalized) {
      return { ok: false, error: 'Evidence hash mismatch: client preview hash does not match server computation' };
    }
  }

  // Construct allowlisted canonical metadata
  const canonicalEvidence: DbEvidenceFile = {
    id: eventIdGenerator(),
    deal_id: metadata.deal_id,
    submitted_by: metadata.submitted_by,
    evidence_kind: metadata.evidence_kind,
    original_filename: metadata.original_filename,
    mime_type: metadata.mime_type,
    byte_size: buffer.length,
    sha256_hash: serverHash,
    display_visibility: metadata.display_visibility,
    chain_operation_reference: null,
    created_at: new Date().toISOString()
  };

  return { ok: true, evidence: canonicalEvidence };
}
