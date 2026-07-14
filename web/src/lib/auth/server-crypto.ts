import 'server-only';
import crypto from 'crypto';

// Warning: For testnet/demo ONLY. Production must use KMS or HSM.
//
// ENCRYPTION VERSIONS:
//   aes-256-gcm-v1 — original version, encrypted with WALLET_ENCRYPTION_KEY_LEGACY (exposed)
//   aes-256-gcm-v2 — current version, encrypted with WALLET_ENCRYPTION_KEY (active)
//
// Dual-key invariant:
//   - New and re-encrypted records always use WALLET_ENCRYPTION_KEY (v2)
//   - Legacy v1 records decrypt using WALLET_ENCRYPTION_KEY_LEGACY
//   - Absence of the required key fails closed — no fallback trial
//   - The browser never receives either key or decrypted material

const ALGORITHM = 'aes-256-gcm';
const VERSION_V1 = 'aes-256-gcm-v1';
const VERSION_V2 = 'aes-256-gcm-v2';

export const ENCRYPTION_VERSION_LEGACY = VERSION_V1;
export const ENCRYPTION_VERSION_CURRENT = VERSION_V2;

function getKey(envVar: string): Buffer {
  const hexKey = process.env[envVar];
  if (!hexKey) {
    throw new Error(
      `${envVar} is not defined. Refusing to run encryption routines.`,
    );
  }
  if (hexKey.trim() === '') {
    throw new Error(
      `${envVar} is empty. Refusing to run encryption routines.`,
    );
  }
  const buffer = Buffer.from(hexKey.trim(), 'hex');
  if (buffer.length !== 32) {
    throw new Error(
      `${envVar} must be a 64-character hex string (32 bytes). Got ${buffer.length} bytes.`,
    );
  }
  return buffer;
}

function getCurrentKey(): Buffer {
  return getKey('WALLET_ENCRYPTION_KEY');
}

function getLegacyKey(): Buffer {
  return getKey('WALLET_ENCRYPTION_KEY_LEGACY');
}

/**
 * Encrypt a Stellar secret using the current active key (v2).
 * Always writes aes-256-gcm-v2.
 */
export function encryptStellarSecret(secret: string): string {
  const key = getCurrentKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a Stellar secret. Key selection is based on the persisted
 * encryption_version string. Never uses trial decryption.
 *
 * @param encryptedString  The stored encrypted blob
 * @param encryptionVersion  The persisted version tag (e.g. 'aes-256-gcm-v1')
 */
export function decryptStellarSecret(
  encryptedString: string,
  encryptionVersion: string = VERSION_V2,
): string {
  const key =
    encryptionVersion === VERSION_V1 ? getLegacyKey() : getCurrentKey();
  return _decryptWithKey(encryptedString, key);
}

/**
 * Internal GCM decrypt. Never called directly from outside this module.
 */
function _decryptWithKey(encryptedString: string, key: Buffer): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Re-encrypt a v1 blob under the current key (v2).
 * Returns the new encrypted blob ready to write to the database.
 * The old blob is never stored after this call.
 */
export function reEncryptV1ToV2(encryptedStringV1: string): string {
  const plaintext = _decryptWithKey(encryptedStringV1, getLegacyKey());
  return encryptStellarSecret(plaintext);
}

/**
 * Checks whether the legacy key environment variable is present and
 * structurally valid (does NOT test whether it actually decrypts any record).
 * Used by preflight to verify dual-key readiness during migration window.
 */
export function isLegacyKeyConfigured(): boolean {
  try {
    getLegacyKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether the current active key is present and structurally valid.
 */
export function isCurrentKeyConfigured(): boolean {
  try {
    getCurrentKey();
    return true;
  } catch {
    return false;
  }
}
