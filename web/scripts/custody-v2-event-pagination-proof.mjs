import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const CONTRACT_ID = 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4';
const ASSET_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const START_LEDGER = 3288466;
const SUCCESS_DEAL_ID = '54c6741ef8c941c4aec25b673db0306f5c635680f1a22a3bb4a673df5e1ebf39';
const EXPIRY_DEAL_ID = 'd0307b1c65779ea8656735f67d1243e94a6936050dbf387fb6fd503a5fa077d1';
const DEPLOYER = 'GAMMNRJFNKHKOPVHYENJWYLFV64DCO6YAIWJGAFCBGNLULYRKBSULWRA';

process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
process.env.NEXT_PUBLIC_CUSTODY_V2_ENABLED = 'true';
process.env.NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE = NETWORK_PASSPHRASE;
process.env.NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID = CONTRACT_ID;
process.env.NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID = ASSET_CONTRACT_ID;
process.env.NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';
process.env.NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION = '2';
process.env.NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION = '2';
process.env.CUSTODY_V2_STELLAR_RPC_URL = RPC_URL;

async function main() {
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  });

  try {
    const [
      { MockRepositoryAdapter },
      { mockStore },
      { loadCustodyV2ServerConfig },
      { StellarCustodyV2ContractReader },
      events,
    ] = await Promise.all([
      server.ssrLoadModule('/src/lib/repositories/mock-adapter.ts'),
      server.ssrLoadModule('/src/lib/db/mock-store.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/config.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/contract-reader.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/events.ts'),
    ]);

    mockStore.seed();
    const repository = new MockRepositoryAdapter();
    const config = loadCustodyV2ServerConfig();
    const reader = new StellarCustodyV2ContractReader(config);

    const firstPass = await events.pollAndIngestCustodyV2Events({
      repository,
      rpcUrl: RPC_URL,
      contractId: CONTRACT_ID,
      startLedger: START_LEDGER,
      limit: 2,
      maxPages: 100,
    });
    const secondPass = await events.pollAndIngestCustodyV2Events({
      repository,
      rpcUrl: RPC_URL,
      contractId: CONTRACT_ID,
      limit: 2,
      maxPages: 5,
    });

    const successEvents = await repository.listCustodyEvents(SUCCESS_DEAL_ID);
    const expiryEvents = await repository.listCustodyEvents(EXPIRY_DEAL_ID);
    const cursor = await repository.getCustodyEventCursor('testnet', CONTRACT_ID);
    const initEvents = Array.from(mockStore.custodyEvents.values()).filter((event) => event.event_type === 'init');
    const successRead = await reader.getDeal(DEPLOYER, SUCCESS_DEAL_ID);
    const expiryRead = await reader.getDeal(DEPLOYER, EXPIRY_DEAL_ID);

    if (firstPass.status !== 'caught_up') throw new Error(`First pagination pass did not catch up: ${firstPass.status}`);
    if (secondPass.appended !== 0) throw new Error(`Replay pass appended ${secondPass.appended} events instead of 0.`);
    if (initEvents.length < 1 || initEvents.some((event) => event.contract_deal_id !== null)) {
      throw new Error('Contract-scoped init event was not persisted with null contract_deal_id.');
    }
    if (successEvents.length !== 11) throw new Error(`Expected 11 success events, saw ${successEvents.length}.`);
    if (expiryEvents.length !== 6) throw new Error(`Expected 6 funding-expiry events, saw ${expiryEvents.length}.`);
    if (!successRead.ok || successRead.value.state !== 'SettledSuccess') {
      throw new Error(`Success deal direct read mismatch: ${successRead.ok ? successRead.value.state : successRead.message}`);
    }
    if (!expiryRead.ok || expiryRead.value.state !== 'FundingExpired') {
      throw new Error(`Expiry deal direct read mismatch: ${expiryRead.ok ? expiryRead.value.state : expiryRead.message}`);
    }

    process.stdout.write(`${JSON.stringify({
      generated_at: new Date().toISOString(),
      network: 'testnet',
      contract_id: CONTRACT_ID,
      start_ledger: START_LEDGER,
      forced_page_limit: 2,
      first_pass: firstPass,
      replay_pass: secondPass,
      cursor,
      contract_scoped_init_events: initEvents.length,
      success: {
        contract_deal_id: SUCCESS_DEAL_ID,
        event_count: successEvents.length,
        direct_state: successRead.value.state,
        terminal_outcome: successRead.value.terminal_outcome,
      },
      funding_expiry: {
        contract_deal_id: EXPIRY_DEAL_ID,
        event_count: expiryEvents.length,
        direct_state: expiryRead.value.state,
        terminal_outcome: expiryRead.value.terminal_outcome,
      },
    }, null, 2)}\n`);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
