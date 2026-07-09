import 'server-only';

export interface FriendbotResponse {
  ok: boolean;
  status: number;
  redactedAddress: string;
  message?: string;
}

/**
 * Funds a Stellar Testnet public key using the official SDF Friendbot.
 * NEVER accepts or returns secret keys. NEVER prints full public addresses unredacted.
 * Strictly constrained to Testnet environments.
 */
export async function fundTestnetWalletViaFriendbot(publicAddress: string): Promise<FriendbotResponse> {
  // Validate public key format (Stellar public keys always start with 'G' and are 56 chars)
  if (!publicAddress || !publicAddress.startsWith('G') || publicAddress.length !== 56) {
    return {
      ok: false,
      status: 400,
      redactedAddress: 'INVALID',
      message: 'Invalid public address format for Friendbot funding.'
    };
  }

  const redactedAddress = `${publicAddress.slice(0, 5)}...${publicAddress.slice(-4)}`;

  // Safe retry logic (max 2 attempts)
  let attempts = 0;
  let lastStatus = 0;
  let lastMessage = '';

  while (attempts < 2) {
    attempts++;
    try {
      const url = `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicAddress)}`;
      const res = await fetch(url);
      
      lastStatus = res.status;

      if (res.ok) {
        return {
          ok: true,
          status: res.status,
          redactedAddress
        };
      }

      const text = await res.text();
      lastMessage = text;

      // Gracefully handle "already funded" - Friendbot sometimes returns 400 with 'op_already_exists' or similar
      // but let's just record it. We'll fail here if it's 400 and let the runner's balance preflight handle actual balances.
      if (res.status === 400 && text.includes('op_already_exists')) {
         return {
           ok: true, // It's already funded
           status: 200,
           redactedAddress,
           message: 'Already funded'
         };
      }

    } catch (err: unknown) {
      lastStatus = 500;
      lastMessage = err instanceof Error ? err.message : String(err);
    }

    // Wait slightly before retry
    if (attempts < 2) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return {
    ok: false,
    status: lastStatus,
    redactedAddress,
    message: `Friendbot rejected or failed after ${attempts} attempts: ${lastMessage}`
  };
}
