/* eslint-disable */
import 'server-only';
import { loadDealRoomTestnetRuntime } from '../src/lib/stellar/server/deal-room-testnet-runtime';

export const dynamic = 'force-dynamic';

async function runPreflight() {
  const result = loadDealRoomTestnetRuntime({
    signer_port_factory: () => ({} as any)
  });

  if (!result.ok) {
    const missing = result.errors.map((e) => e.field);
    console.log(JSON.stringify({
      status: 'BLOCKED',
      missing,
    }, null, 2));
    process.exit(1);
  }

  // Preflight successful
  console.log(JSON.stringify({
    status: 'READY',
    contract_id: result.runtime.contract_id,
    custody_contract_id: result.runtime.custody_contract_id,
    testnet_token_contract_id: result.runtime.testnet_token_contract_id,
  }, null, 2));
}

runPreflight().catch(err => {
  console.error(err);
  process.exit(1);
});
