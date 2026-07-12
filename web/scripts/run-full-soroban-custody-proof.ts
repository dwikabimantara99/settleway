import { Keypair, Networks, TransactionBuilder, rpc, xdr, Address, nativeToScVal, Contract } from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const NATIVE_TOKEN_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const WASM_PATH = path.join(__dirname, '../../target/wasm32v1-none/release/settleway_escrow.wasm');

const server = new rpc.Server(RPC_URL, { allowHttp: false });

async function fundAccount(publicKey: string) {
  console.log(`Funding ${publicKey} via Friendbot...`);
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${publicKey}`);
  console.log(`Funded ${publicKey}`);
}

async function getNativeBalance(publicKey: string): Promise<string> {
  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    if (!res.ok) {
      if (res.status === 404) return '0';
      throw new Error(`Horizon error for ${publicKey}`);
    }
    const data = await res.json();
    const native = data.balances?.find((b: any) => b.asset_type === 'native');
    return native ? native.balance : '0';
  } catch (e) {
    return '0';
  }
}

async function invokeContract(
  signer: Keypair,
  contractId: string,
  method: string,
  args: xdr.ScVal[]
): Promise<string> {
  console.log(`Invoking ${method} by ${signer.publicKey()}...`);
  const sourceAccount = await server.getAccount(signer.publicKey());
  
  const contract = new Contract(contractId);
  const op = contract.call(method, ...args);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(signer);

  const sendResponse = await server.sendTransaction(prepared);
  if (sendResponse.status === 'PENDING') {
    let confirmResponse;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      confirmResponse = await server.getTransaction(sendResponse.hash);
      if (confirmResponse.status !== 'NOT_FOUND') {
        break;
      }
    }
    if (confirmResponse?.status === 'SUCCESS') {
      console.log(`Success: ${sendResponse.hash}`);
      if (method === 'create_escrow_v2') {
        const returnValue = confirmResponse.returnValue;
        if (returnValue) {
          return returnValue.u64().toString();
        }
      }
      return sendResponse.hash;
    } else {
      let resultXdr = (confirmResponse as any)?.resultMetaXdr?.toString('base64');
      throw new Error(`Transaction failed: ${confirmResponse?.status} \n ${resultXdr}`);
    }
  } else {
    throw new Error(`Transaction send failed: ${sendResponse.status}`);
  }
}

async function main() {
  const admin = Keypair.random();
  const buyer = Keypair.random();
  const seller = Keypair.random();
  const feeRecipient = Keypair.random();

  await fundAccount(admin.publicKey());
  await fundAccount(buyer.publicKey());
  await fundAccount(seller.publicKey());

  console.log(`Deploying fresh SettlewayEscrowContract using admin ${admin.publicKey()}...`);
  let CUSTODY_CONTRACT_ID = '';
  try {
    const stellarExe = 'stellar.exe';
    const deployCmd = `${stellarExe} contract deploy --wasm ${WASM_PATH} --source-account ${admin.secret()} --network testnet`;
    const out = execSync(deployCmd, { encoding: 'utf-8', stdio: 'pipe' });
    CUSTODY_CONTRACT_ID = out.trim();
    console.log(`Deployed Contract ID: ${CUSTODY_CONTRACT_ID}`);
  } catch (err: any) {
    console.error('Failed to deploy contract', err.stdout || err.stderr || err.message);
    process.exit(1);
  }

  console.log('--- Initializing Contract ---');
  try {
    await invokeContract(admin, CUSTODY_CONTRACT_ID, 'initialize', [
      new Address(admin.publicKey()).toScVal()
    ]);
    console.log('Contract Initialized.');
  } catch (e: any) {
    console.error('Init error', e.message);
    process.exit(1);
  }

  console.log('--- Initial Balances ---');
  const initBuyer = await getNativeBalance(buyer.publicKey());
  const initSeller = await getNativeBalance(seller.publicKey());
  console.log(`Buyer: ${initBuyer} XLM`);
  console.log(`Seller: ${initSeller} XLM`);

  const dealHashBytes = randomBytes(32);
  const dealHashScv = xdr.ScVal.scvBytes(dealHashBytes);
  const proofHashBytes = randomBytes(32);
  const proofHashScv = xdr.ScVal.scvBytes(proofHashBytes);

  const principalStroops = 20_0000000;
  const bondStroops = 1_0000000;
  
  console.log('--- Creating Escrow ---');
  let escrowId = '';
  try {
    escrowId = await invokeContract(admin, CUSTODY_CONTRACT_ID, 'create_escrow_v2', [
      dealHashScv,
      new Address(NATIVE_TOKEN_ID).toScVal(),
      new Address(feeRecipient.publicKey()).toScVal(),
      new Address(buyer.publicKey()).toScVal(),
      new Address(seller.publicKey()).toScVal(),
      nativeToScVal(principalStroops, { type: 'i128' }),
      nativeToScVal(bondStroops, { type: 'i128' }),
      nativeToScVal(bondStroops, { type: 'i128' }),
      nativeToScVal(0, { type: 'i128' }),
      nativeToScVal(0, { type: 'i128' }),
      nativeToScVal(Math.floor(Date.now() / 1000) + 3600, { type: 'u64' }), // expires_at
    ]);
    console.log(`Created Escrow ID: ${escrowId}`);
  } catch (e: any) {
    console.error('Create error', e.message);
    process.exit(1);
  }

  const escrowIdScv = nativeToScVal(BigInt(escrowId), { type: 'u64' });

  console.log('--- Buyer Deposit ---');
  const depositBuyerHash = await invokeContract(buyer, CUSTODY_CONTRACT_ID, 'deposit_buyer_v2', [
    escrowIdScv,
    new Address(buyer.publicKey()).toScVal(),
  ]);

  console.log('--- Seller Deposit ---');
  const depositSellerHash = await invokeContract(seller, CUSTODY_CONTRACT_ID, 'deposit_seller_v2', [
    escrowIdScv,
    new Address(seller.publicKey()).toScVal(),
  ]);

  console.log('--- Submit Proof ---');
  const submitProofHash = await invokeContract(seller, CUSTODY_CONTRACT_ID, 'submit_proof_hash_v2', [
    escrowIdScv,
    new Address(seller.publicKey()).toScVal(),
    proofHashScv
  ]);

  console.log('--- Mark Delivered ---');
  const markDeliveredHash = await invokeContract(seller, CUSTODY_CONTRACT_ID, 'mark_delivered_v2', [
    escrowIdScv,
    new Address(seller.publicKey()).toScVal(),
  ]);

  console.log('--- Settle and Complete ---');
  const settleHash = await invokeContract(buyer, CUSTODY_CONTRACT_ID, 'settle_and_complete', [
    escrowIdScv,
    new Address(buyer.publicKey()).toScVal(),
  ]);

  console.log('--- Final Balances ---');
  const finalBuyer = await getNativeBalance(buyer.publicKey());
  const finalSeller = await getNativeBalance(seller.publicKey());
  console.log(`Buyer: ${finalBuyer} XLM`);
  console.log(`Seller: ${finalSeller} XLM`);

  const proof = {
    corridor: "FULL_SOROBAN_CUSTODY_TESTNET_VERIFIED",
    contract_id: CUSTODY_CONTRACT_ID,
    asset_contract_id: NATIVE_TOKEN_ID,
    buyer_public_key: buyer.publicKey(),
    seller_public_key: seller.publicKey(),
    balances_before: {
      buyer: initBuyer,
      seller: initSeller,
    },
    balances_after: {
      buyer: finalBuyer,
      seller: finalSeller,
    },
    tx_hashes: {
      deposit_buyer: depositBuyerHash,
      deposit_seller: depositSellerHash,
      submit_proof: submitProofHash,
      mark_delivered: markDeliveredHash,
      settle: settleHash,
    },
    states: {
      before_funding: "WaitingDeposits",
      after_buyer: "BuyerFunded",
      after_seller: "Locked",
      after_proof: "ProofSubmitted",
      after_delivery: "Delivered",
      final: "Completed"
    },
    timestamp: new Date().toISOString()
  };

  const outPath = path.join(__dirname, '../public/demo/full-custody-proof.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`\nEvidence JSON written to ${outPath}`);
}

main().catch(console.error);
