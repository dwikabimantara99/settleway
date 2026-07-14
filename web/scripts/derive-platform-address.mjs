import { Keypair } from '@stellar/stellar-sdk';

const secret = process.env.STELLAR_PLATFORM_SECRET;
if (!secret) {
  console.error("PLATFORM SIGNING SECRET ABSENT \u2014 REAL TESTNET FUNDING BLOCKED");
  process.exit(1);
}

try {
  const kp = Keypair.fromSecret(secret);
  console.log(`PLATFORM_PUBLIC_ADDRESS=${kp.publicKey()}`);
} catch (e) {
  console.error("Invalid secret format");
  process.exit(1);
}
