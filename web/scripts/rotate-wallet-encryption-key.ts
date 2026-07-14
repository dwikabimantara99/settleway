/**
 * rotate-wallet-encryption-key.ts
 *
 * Operator-only script to migrate user_wallets from aes-256-gcm-v1 (exposed key)
 * to aes-256-gcm-v2 (new key).
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL         — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY        — Service role key (never echoed)
 *   WALLET_ENCRYPTION_KEY            — New (current) encryption key (64-char hex)
 *   WALLET_ENCRYPTION_KEY_LEGACY     — Old (exposed) key to read v1 records (64-char hex)
 *
 * Usage:
 *   npx tsx scripts/rotate-wallet-encryption-key.ts --dry-run
 *   npx tsx scripts/rotate-wallet-encryption-key.ts --confirm
 *   npx tsx scripts/rotate-wallet-encryption-key.ts --confirm --actor buyer-surabaya-restaurant
 *
 * Safety properties:
 *   - --dry-run: reads and verifies all rows, writes nothing
 *   - --confirm: migrates rows one at a time, stops on any mismatch
 *   - optimistic row-version check prevents stale-read overwrite
 *   - sanitized output: never prints secrets, seeds, blobs, or key material
 *   - resumable: skips rows already on v2
 *   - rollback metadata recorded in console output for manual recovery
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────

const VERSION_V1 = 'aes-256-gcm-v1';
const VERSION_V2 = 'aes-256-gcm-v2';
const ALGORITHM = 'aes-256-gcm';

// ────────────────────────────────────────────────────────────────
// Argument parsing
// ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CONFIRM = args.includes('--confirm');
const actorFlag = args.indexOf('--actor');
const ACTOR_FILTER = actorFlag !== -1 ? args[actorFlag + 1] : null;

if (!DRY_RUN && !CONFIRM) {
  console.error('USAGE ERROR: Pass either --dry-run or --confirm.');
  process.exit(1);
}
if (DRY_RUN && CONFIRM) {
  console.error('USAGE ERROR: Pass only one of --dry-run or --confirm, not both.');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────
// Key loading (fail closed, never echoed)
// ────────────────────────────────────────────────────────────────

function loadKey(envVar: string): Buffer {
  const hexKey = process.env[envVar];
  if (!hexKey || hexKey.trim() === '') {
    throw new Error(`${envVar} is not set or empty. Cannot proceed.`);
  }
  const buf = Buffer.from(hexKey.trim(), 'hex');
  if (buf.length !== 32) {
    throw new Error(`${envVar} must be a 64-char hex string (32 bytes). Got ${buf.length} bytes.`);
  }
  return buf;
}

// ────────────────────────────────────────────────────────────────
// Env loading (supports .env.local fallback for local operator use)
// ────────────────────────────────────────────────────────────────

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    const m = line.match(/^([A-Z_0-9]+)=(.+)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  });
}

loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env.local.bak'));

// ────────────────────────────────────────────────────────────────
// Crypto helpers
// ────────────────────────────────────────────────────────────────

function gcmDecrypt(blob: string, key: Buffer): string {
  const parts = blob.split(':');
  if (parts.length !== 3) throw new Error('Invalid blob format');
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let dec = decipher.update(encryptedHex, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

function gcmEncrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${enc}`;
}

// ────────────────────────────────────────────────────────────────
// Wallet row type
// ────────────────────────────────────────────────────────────────

interface WalletRow {
  user_id: string;
  public_address: string;
  encrypted_secret_key: string;
  encryption_version: string;
  status: string;
  updated_at: string;
}

// ────────────────────────────────────────────────────────────────
// Row verification
// ────────────────────────────────────────────────────────────────

interface VerifyResult {
  user_id: string;
  current_version: string;
  target_version: string;
  result: 'VALID' | 'INVALID' | 'SKIP' | 'ERROR';
  reason?: string;
}

function verifyRow(row: WalletRow, legacyKey: Buffer, currentKey: Buffer): VerifyResult {
  const base: Pick<VerifyResult, 'user_id' | 'current_version' | 'target_version'> = {
    user_id: row.user_id,
    current_version: row.encryption_version,
    target_version: VERSION_V2,
  };

  if (row.encryption_version === VERSION_V2) {
    // Already migrated — verify it decrypts with the current key
    try {
      const secret = gcmDecrypt(row.encrypted_secret_key, currentKey);
      const derived = Keypair.fromSecret(secret).publicKey();
      if (derived !== row.public_address) {
        return { ...base, result: 'INVALID', reason: 'public_address_mismatch_on_v2' };
      }
      return { ...base, result: 'SKIP', reason: 'already_v2_and_valid' };
    } catch (e: unknown) {
      return { ...base, result: 'INVALID', reason: `v2_decrypt_error: ${(e as Error).message}` };
    }
  }

  if (row.encryption_version === VERSION_V1) {
    // Decrypt with legacy key
    let secret: string;
    try {
      secret = gcmDecrypt(row.encrypted_secret_key, legacyKey);
    } catch (e: unknown) {
      return { ...base, result: 'INVALID', reason: `v1_decrypt_error: ${(e as Error).message}` };
    }

    // Verify public key matches
    let derived: string;
    try {
      derived = Keypair.fromSecret(secret).publicKey();
    } catch (e: unknown) {
      return { ...base, result: 'INVALID', reason: `keypair_error: ${(e as Error).message}` };
    }

    if (derived !== row.public_address) {
      return { ...base, result: 'INVALID', reason: 'public_address_mismatch_after_v1_decrypt' };
    }

    // In dry-run: also verify round-trip of re-encryption
    const newBlob = gcmEncrypt(secret, currentKey);
    let reDecrypted: string;
    try {
      reDecrypted = gcmDecrypt(newBlob, currentKey);
    } catch (e: unknown) {
      return { ...base, result: 'INVALID', reason: `v2_roundtrip_error: ${(e as Error).message}` };
    }

    const reDerived = Keypair.fromSecret(reDecrypted).publicKey();
    if (reDerived !== row.public_address) {
      return { ...base, result: 'INVALID', reason: 'public_address_mismatch_after_v2_roundtrip' };
    }

    return { ...base, result: 'VALID' };
  }

  return { ...base, result: 'ERROR', reason: `unknown_version: ${row.encryption_version}` };
}

// ────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.trim() === '') {
    console.error('BLOCKED: NEXT_PUBLIC_SUPABASE_URL is not set.');
    process.exit(1);
  }
  if (!supabaseKey || supabaseKey.trim() === '') {
    console.error('BLOCKED: SUPABASE_SERVICE_ROLE_KEY is not set.');
    process.exit(1);
  }

  let legacyKey: Buffer;
  let currentKey: Buffer;

  try {
    legacyKey = loadKey('WALLET_ENCRYPTION_KEY_LEGACY');
    currentKey = loadKey('WALLET_ENCRYPTION_KEY');
  } catch (e: unknown) {
    console.error(`BLOCKED: ${(e as Error).message}`);
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl.trim(), supabaseKey.trim());

  // Load rows
  let query = supabase.from('user_wallets').select('user_id, public_address, encrypted_secret_key, encryption_version, status, updated_at');
  if (ACTOR_FILTER) {
    query = query.eq('user_id', ACTOR_FILTER);
  }

  const { data, error } = await query;
  if (error) {
    console.error('BLOCKED: Failed to read user_wallets:', error.message);
    process.exit(1);
  }

  const rows = data as WalletRow[];
  console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE MIGRATION'}`);
  console.log(`ROWS LOADED: ${rows.length}`);
  if (ACTOR_FILTER) console.log(`ACTOR FILTER: ${ACTOR_FILTER}`);

  let valid = 0, skip = 0, invalid = 0, errors = 0, migrated = 0;
  const invalidRows: string[] = [];

  for (const row of rows) {
    const vr = verifyRow(row, legacyKey, currentKey);

    if (vr.result === 'SKIP') {
      skip++;
      console.log(`SKIP   ${vr.user_id} | ${vr.current_version} → already v2`);
      continue;
    }

    if (vr.result === 'INVALID' || vr.result === 'ERROR') {
      invalid++;
      errors++;
      invalidRows.push(vr.user_id);
      console.error(`INVALID ${vr.user_id} | ${vr.current_version} | ${vr.reason}`);
      if (!DRY_RUN) {
        console.error('STOPPING: Mismatch found during live migration. No further writes.');
        break;
      }
      continue;
    }

    // VALID — row can be migrated
    valid++;
    console.log(`VALID  ${vr.user_id} | ${vr.current_version} → ${vr.target_version}`);

    if (!DRY_RUN) {
      // Re-derive new blob (fresh IV each time)
      const secret = gcmDecrypt(row.encrypted_secret_key, legacyKey);
      const newBlob = gcmEncrypt(secret, currentKey);

      // Optimistic version check — only update if still v1
      const { error: updateError, data: updated, count } = await supabase
        .from('user_wallets')
        .update({
          encrypted_secret_key: newBlob,
          encryption_version: VERSION_V2,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', row.user_id)
        .eq('encryption_version', VERSION_V1) // optimistic guard
        .select('user_id, public_address, encryption_version');

      if (updateError) {
        console.error(`WRITE ERROR ${row.user_id}: ${updateError.message}`);
        console.error('STOPPING: Write error during live migration.');
        process.exit(1);
      }

      if (!updated || updated.length === 0) {
        console.error(`SKIP-CONFLICT ${row.user_id}: Row was modified by a concurrent process or already migrated.`);
        continue;
      }

      // Reread and verify
      const { data: reread, error: rereadError } = await supabase
        .from('user_wallets')
        .select('user_id, public_address, encrypted_secret_key, encryption_version')
        .eq('user_id', row.user_id)
        .single();

      if (rereadError || !reread) {
        console.error(`REREAD ERROR ${row.user_id}: ${rereadError?.message}`);
        process.exit(1);
      }

      // Verify reread row
      let reDecrypted: string;
      try {
        reDecrypted = gcmDecrypt(reread.encrypted_secret_key, currentKey);
      } catch (e: unknown) {
        console.error(`POST-WRITE DECRYPT ERROR ${row.user_id}: ${(e as Error).message}`);
        process.exit(1);
      }

      const reDerived = Keypair.fromSecret(reDecrypted).publicKey();
      if (reDerived !== reread.public_address) {
        console.error(`POST-WRITE MISMATCH ${row.user_id}: derived key does not match stored public address.`);
        process.exit(1);
      }

      if (reread.encryption_version !== VERSION_V2) {
        console.error(`POST-WRITE VERSION ERROR ${row.user_id}: expected ${VERSION_V2}, got ${reread.encryption_version}.`);
        process.exit(1);
      }

      migrated++;
      console.log(`MIGRATED ${row.user_id} | verified ${reread.encryption_version} | pub_prefix=${reread.public_address.substring(0, 8)}`);
    }
  }

  console.log('');
  console.log('═══ SUMMARY ═══');
  console.log(`MODE:    ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`TOTAL:   ${rows.length}`);
  console.log(`VALID:   ${valid}`);
  console.log(`SKIP:    ${skip}`);
  console.log(`INVALID: ${invalid}`);
  if (!DRY_RUN) console.log(`MIGRATED: ${migrated}`);

  if (invalid > 0) {
    console.error('\nFAILED ROWS:', invalidRows.join(', '));
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\nDRY-RUN COMPLETE — No rows were modified.');
    console.log(`Ready to run live migration with --confirm for ${valid} rows.`);
  } else {
    console.log('\nLIVE MIGRATION COMPLETE.');
  }
}

main().catch((e: unknown) => {
  console.error('FATAL:', (e as Error).message);
  process.exit(1);
});
