import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { Account, Contract, rpc, scValToNative, TransactionBuilder } from '@stellar/stellar-sdk';

const CONTRACT_ID = 'CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4';
const ASSET_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';

const IDENTITIES = {
  deployer: {
    alias: 'settleway-int-deployer',
    public: 'GAMMNRJFNKHKOPVHYENJWYLFV64DCO6YAIWJGAFCBGNLULYRKBSULWRA',
  },
  buyer: {
    alias: 'settleway-int-buyer',
    public: 'GBKDCPZYIKBDVJDBXBURZCAV2N3QS6HDSFLAQ6O37P2ONEMEMTBFWDBA',
  },
  seller: {
    alias: 'settleway-int-seller',
    public: 'GA4JCPSQOPPKUMKYY2RQK5WFIWTWPBUWCBJ2EHTHNREUEB6ASDX4Q4IU',
  },
  mediator: {
    alias: 'settleway-int-mediator',
    public: 'GD5DEAIORQAKYJVN6DVQBYR7I2T3HFRV6U3OQEMZ3T4WHL274Y4BVXJ3',
  },
  treasury: {
    alias: 'settleway-int-treasury',
    public: 'GDSOYRJWEFYJPLTOLOG775LQJI7S66UYNQ3IJSXWYYZON27HT7EOVLO2',
  },
  keeper: {
    alias: 'settleway-int-keeper',
    public: 'GCZVVYK2KVRX4GMM6AQETMOMDXTFW37MYNN5MZZWKXFA27FTLWLZCRAI',
  },
};

process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
process.env.NEXT_PUBLIC_CUSTODY_V2_ENABLED = 'true';
process.env.NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE = NETWORK_PASSPHRASE;
process.env.NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID = CONTRACT_ID;
process.env.NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID = ASSET_CONTRACT_ID;
process.env.NEXT_PUBLIC_CUSTODY_V2_EXPLORER_BASE = EXPLORER_BASE;
process.env.NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION = '2';
process.env.NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION = '2';
process.env.CUSTODY_V2_STELLAR_RPC_URL = RPC_URL;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function signWithAlias(unsignedXdr, alias) {
  const result = spawnSync('stellar', [
    'tx',
    'sign',
    '--sign-with-key',
    alias,
    '--network-passphrase',
    NETWORK_PASSPHRASE,
    '--rpc-url',
    RPC_URL,
    '--auto-sign',
    '--quiet',
  ], {
    input: unsignedXdr,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });
  if (result.status !== 0) {
    throw new Error(`Stellar CLI signing failed for alias ${alias}: ${result.stderr || result.stdout}`);
  }
  const signed = result.stdout.trim();
  if (!signed) throw new Error(`Stellar CLI signing returned empty XDR for alias ${alias}.`);
  return signed;
}

async function nativeBalance(server, address) {
  void server;
  const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
  if (!response.ok) throw new Error(`Horizon balance lookup failed for ${address}: ${response.status}`);
  const account = await response.json();
  const native = account.balances.find((balance) => balance.asset_type === 'native');
  if (!native) throw new Error(`Native balance not found for ${address}.`);
  return native.balance;
}

async function readContractConfig(server) {
  const source = await server.getAccount(IDENTITIES.deployer.public);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(new Account(IDENTITIES.deployer.public, source.sequenceNumber()), {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_config'))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error ?? 'get_config simulation failed');
  return scValToNative(sim.result.retval);
}

async function invokeAppAction(ctx, dealId, actionType, actor, evidenceHash) {
  const prepared = await ctx.prepareCustodyV2Operation({
    repository: ctx.repository,
    rpcPort: ctx.rpcPort,
    config: ctx.config,
    contractReader: ctx.reader,
    applicationDealId: dealId,
    actionType,
    actorAddress: actor.public,
    evidenceHash,
  });
  const signedXdr = signWithAlias(prepared.unsigned_xdr, actor.alias);
  ctx.verifySignedCustodyV2Envelope({
    signedXdr,
    preparedOperation: prepared.operation,
    networkPassphrase: NETWORK_PASSPHRASE,
    expectedSigner: actor.public,
  });
  const submitted = await ctx.rpcPort.submitTransaction(signedXdr);
  if (!submitted.ok && submitted.status !== 'duplicate') {
    await ctx.repository.updateCustodyOperation(prepared.operation.idempotency_key, {
      status: 'failed',
      failure_code: submitted.status === 'rejected' ? submitted.error_code : submitted.status,
      rpc_result_category: submitted.status,
    });
    throw new Error(`Submit failed for ${actionType}: ${submitted.status}${submitted.error_code ? ` (${submitted.error_code})` : ''}`);
  }
  await ctx.repository.updateCustodyOperation(prepared.operation.idempotency_key, {
    status: 'submitted',
    transaction_hash: submitted.transaction_hash,
    rpc_result_category: submitted.ok ? 'pending' : 'duplicate',
  });

  let confirmation;
  for (let i = 0; i < 24; i += 1) {
    confirmation = await ctx.rpcPort.confirmTransaction(submitted.transaction_hash);
    if (confirmation.outcome === 'confirmed' || confirmation.outcome === 'failed') break;
    await sleep(5000);
  }
  if (!confirmation || confirmation.outcome !== 'confirmed') {
    throw new Error(`Confirmation failed for ${actionType}: ${confirmation?.outcome ?? 'timeout'}`);
  }

  await ctx.repository.updateCustodyOperation(prepared.operation.idempotency_key, {
    status: 'confirmed',
    rpc_result_category: 'confirmed',
    confirmed_ledger: confirmation.ledger ?? null,
  });
  const chainDeal = await ctx.reader.getDeal(actor.public, prepared.operation.contract_deal_id);
  if (!chainDeal.ok) throw new Error(`Direct contract read failed after ${actionType}: ${chainDeal.message}`);
  const link = await ctx.applyChainCustodyProjection({
    repository: ctx.repository,
    applicationDealId: dealId,
    chainDeal: chainDeal.value,
    confirmedLedger: confirmation.ledger ?? chainDeal.latestLedger,
  });

  return {
    action: actionType,
    idempotency_key: prepared.operation.idempotency_key,
    transaction_hash: submitted.transaction_hash,
    ledger: confirmation.ledger ?? chainDeal.latestLedger,
    contract_state: chainDeal.value.state,
    terminal_outcome: chainDeal.value.terminal_outcome,
    projection_state: link.latest_contract_state,
  };
}

function buildDeal(id, principalIdr, volumeKg) {
  return {
    id,
    listing_id: 'listing-cabai-001',
    buyer_request_id: null,
    buyer_id: 'buyer-surabaya-restaurant',
    seller_id: 'seller-probolinggo-cabai',
    commodity: "Red Curly Chili (Bird's Eye Chili)",
    volume_kg: volumeKg,
    principal_idr: principalIdr,
    buyer_bond_idr: Math.round(principalIdr * 0.05),
    seller_bond_idr: Math.round(principalIdr * 0.05),
    buyer_fee_idr: 0,
    seller_fee_idr: 0,
    buyer_total_idr: principalIdr,
    seller_total_idr: Math.round(principalIdr * 0.05),
    status: 'WAITING_DEPOSITS',
    rail_version: 'custody_v2_testnet',
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: { offer_id: id.replace('deal-', 'offer-') },
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

async function createFrozenDeal(ctx, label, deadlines) {
  const id = `custody-v2-app-${label}-${Date.now()}`;
  const deal = buildDeal(id, label === 'success' ? 19950000 : 14000000, label === 'success' ? 700 : 500);
  await ctx.repository.createDeal(deal);
  const link = await ctx.freezeCustodyV2Deal({
    repository: ctx.repository,
    config: ctx.config,
    deal,
    buyerAddress: IDENTITIES.buyer.public,
    sellerAddress: IDENTITIES.seller.public,
    mediatorAddress: IDENTITIES.mediator.public,
    principalBaseUnits: label === 'success' ? '1000000' : '700000',
    buyerBondBaseUnits: label === 'success' ? '100000' : '70000',
    sellerBondBaseUnits: label === 'success' ? '100000' : '70000',
    fundingDeadlineUnix: deadlines.funding,
    deliveryDeadlineUnix: deadlines.delivery,
    inspectionDeadlineUnix: deadlines.inspection,
    qualitySpecification: 'Grade A, minimum size 3 cm; evidence-backed harvest lot.',
    deliveryDestination: 'Surabaya distribution warehouse.',
    requiredEvidence: ['recent product photos', 'delivery proof', 'signed receipt'],
  });
  return { deal, link };
}

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
      { StellarSdkRpc },
      { StellarCustodyV2ContractReader },
      operations,
      { freezeCustodyV2Deal },
      projection,
      events,
    ] = await Promise.all([
      server.ssrLoadModule('/src/lib/repositories/mock-adapter.ts'),
      server.ssrLoadModule('/src/lib/db/mock-store.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/config.ts'),
      server.ssrLoadModule('/src/lib/stellar/server/stellar-sdk-rpc.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/contract-reader.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/operations.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/links.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/projection.ts'),
      server.ssrLoadModule('/src/lib/custody-v2/events.ts'),
    ]);

    mockStore.seed();
    const repository = new MockRepositoryAdapter();
    const config = loadCustodyV2ServerConfig();
    const rpcPort = new StellarSdkRpc(config.rpcUrl, config.networkPassphrase);
    const reader = new StellarCustodyV2ContractReader(config);
    const ctx = {
      repository,
      config,
      rpcPort,
      reader,
      prepareCustodyV2Operation: operations.prepareCustodyV2Operation,
      verifySignedCustodyV2Envelope: operations.verifySignedCustodyV2Envelope,
      freezeCustodyV2Deal,
      applyChainCustodyProjection: projection.applyChainCustodyProjection,
    };

    const stellar = new rpc.Server(RPC_URL);
    const configRead = await readContractConfig(stellar);
    const latestLedger = await stellar.getLatestLedger();
    const nowUnix = Number(latestLedger.closeTime);
    const beforeBalances = {
      buyer: await nativeBalance(stellar, IDENTITIES.buyer.public),
      seller: await nativeBalance(stellar, IDENTITIES.seller.public),
      treasury: await nativeBalance(stellar, IDENTITIES.treasury.public),
    };

    const success = await createFrozenDeal(ctx, 'success', {
      funding: nowUnix + 240,
      delivery: nowUnix + 1200,
      inspection: nowUnix + 1800,
    });
    const successEvidenceHash = sha256Hex('settleway-app-integration-success-evidence-v1');
    const successOps = [];
    successOps.push(await invokeAppAction(ctx, success.deal.id, 'CREATE_DEAL', IDENTITIES.buyer));
    successOps.push(await invokeAppAction(ctx, success.deal.id, 'ACCEPT_TERMS', IDENTITIES.seller));
    successOps.push(await invokeAppAction(ctx, success.deal.id, 'FUND_BUYER', IDENTITIES.buyer));
    successOps.push(await invokeAppAction(ctx, success.deal.id, 'FUND_SELLER', IDENTITIES.seller));
    successOps.push(await invokeAppAction(ctx, success.deal.id, 'SUBMIT_EVIDENCE', IDENTITIES.seller, successEvidenceHash));
    successOps.push(await invokeAppAction(ctx, success.deal.id, 'ACCEPT_DELIVERY', IDENTITIES.buyer));
    const successEvents = await events.pollAndIngestCustodyV2Events({
      repository,
      rpcUrl: RPC_URL,
      contractId: CONTRACT_ID,
      startLedger: Math.max(1, (successOps[0].ledger ?? latestLedger.sequence) - 20),
      limit: 200,
    });

    const expiryLatest = await stellar.getLatestLedger();
    const expiryNowUnix = Number(expiryLatest.closeTime);
    const expiry = await createFrozenDeal(ctx, 'expiry', {
      funding: expiryNowUnix + 45,
      delivery: expiryNowUnix + 1200,
      inspection: expiryNowUnix + 1800,
    });
    const expiryOps = [];
    expiryOps.push(await invokeAppAction(ctx, expiry.deal.id, 'CREATE_DEAL', IDENTITIES.buyer));
    expiryOps.push(await invokeAppAction(ctx, expiry.deal.id, 'ACCEPT_TERMS', IDENTITIES.seller));
    expiryOps.push(await invokeAppAction(ctx, expiry.deal.id, 'FUND_BUYER', IDENTITIES.buyer));

    for (;;) {
      const latest = await stellar.getLatestLedger();
      if (Number(latest.closeTime) >= expiry.link.funding_deadline_unix + 2) break;
      await sleep(5000);
    }
    expiryOps.push(await invokeAppAction(ctx, expiry.deal.id, 'EXPIRE_FUNDING', IDENTITIES.keeper));
    const expiryEvents = await events.pollAndIngestCustodyV2Events({
      repository,
      rpcUrl: RPC_URL,
      contractId: CONTRACT_ID,
      startLedger: Math.max(1, (expiryOps[0].ledger ?? latestLedger.sequence) - 20),
      limit: 200,
    });

    const afterBalances = {
      buyer: await nativeBalance(stellar, IDENTITIES.buyer.public),
      seller: await nativeBalance(stellar, IDENTITIES.seller.public),
      treasury: await nativeBalance(stellar, IDENTITIES.treasury.public),
    };

    const successLink = await repository.getCustodyDealLink(success.deal.id);
    const expiryLink = await repository.getCustodyDealLink(expiry.deal.id);
    const proof = {
      generated_at: nowIso(),
      network: 'testnet',
      contract_id: CONTRACT_ID,
      accepted_asset_contract_id: ASSET_CONTRACT_ID,
      config_read: configRead,
      role_public_addresses: Object.fromEntries(Object.entries(IDENTITIES).map(([role, identity]) => [role, identity.public])),
      balances: { before: beforeBalances, after: afterBalances },
      scenario_a_success: {
        application_deal_id: success.deal.id,
        contract_deal_id: success.link.contract_deal_id,
        terms_hash: success.link.terms_hash,
        evidence_hash: successEvidenceHash,
        operations: successOps,
        final_projection_state: successLink?.latest_contract_state,
        final_terminal_outcome: successLink?.latest_terminal_outcome,
        event_ingestion: successEvents,
      },
      scenario_b_funding_expiry: {
        application_deal_id: expiry.deal.id,
        contract_deal_id: expiry.link.contract_deal_id,
        terms_hash: expiry.link.terms_hash,
        operations: expiryOps,
        final_projection_state: expiryLink?.latest_contract_state,
        final_terminal_outcome: expiryLink?.latest_terminal_outcome,
        event_ingestion: expiryEvents,
      },
    };

    process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
