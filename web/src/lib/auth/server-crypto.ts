import 'server-only';
import crypto from 'crypto';

// Warning: For testnet/demo ONLY. Production must use KMS or HSM.
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const hexKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('WALLET_ENCRYPTION_KEY is not defined. Refusing to run encryption routines.');
  }
  const buffer = Buffer.from(hexKey, 'hex');
  if (buffer.length !== 32) {
    throw new Error('WALLET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return buffer;
}

export function encryptStellarSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptStellarSecret(encryptedString: string): string {
  const key = getEncryptionKey();
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
