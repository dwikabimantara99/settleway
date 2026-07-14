import 'server-only';
import { Keypair } from '@stellar/stellar-sdk';
import { encryptStellarSecret, ENCRYPTION_VERSION_CURRENT } from '@/lib/auth/server-crypto';
import type { DbUserWallet } from '@/lib/db/types';

export function generateAndEncryptProfileWallet(userId: string): DbUserWallet {
  // Generate random stellar keypair (testnet demo only)
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secret = keypair.secret();

  const encryptedSecret = encryptStellarSecret(secret);

  return {
    user_id: userId,
    public_address: publicKey,
    encrypted_secret_key: encryptedSecret,
    encryption_version: ENCRYPTION_VERSION_CURRENT,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
