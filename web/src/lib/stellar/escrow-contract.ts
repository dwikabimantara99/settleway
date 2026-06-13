import * as StellarSdk from '@stellar/stellar-sdk';
import { rpcServer, platformKeypair, CONTRACT_ID as contractId, networkPassphrase } from './client';

export const platformAddress = platformKeypair?.publicKey() || '';

export async function invokeEscrowMethod(method: string, args: StellarSdk.xdr.ScVal[] = []): Promise<{ hash: string, returnValue: any } | null> {
  if (!platformKeypair || !contractId) {
    console.warn(`[Stellar] Mock Fallback: Missing config for ${method}`);
    return null;
  }

  try {
    const contract = new StellarSdk.Contract(contractId);
    
    // 1. Get account details
    const account = await rpcServer.getAccount(platformAddress);
    
    // 2. Build transaction
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000', // Soroban fees might be higher
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    // 3. Simulate
    const simTx = await rpcServer.simulateTransaction(tx);
    if (!StellarSdk.rpc.Api.isSimulationSuccess(simTx)) {
      console.error(`[Stellar] Simulation failed for ${method}:`, simTx.error || simTx);
      return null;
    }

    // 4. Assemble & Sign
    const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simTx) as any;
    assembledTx.sign(platformKeypair);

    // 5. Submit
    const sendRes = await rpcServer.sendTransaction(assembledTx);
    if (sendRes.status === 'ERROR') {
      console.error(`[Stellar] Send failed for ${method}:`, sendRes);
      return null;
    }

    // 6. Poll for status
    let getRes = await rpcServer.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      getRes = await rpcServer.getTransaction(sendRes.hash);
      attempts++;
    }

    if (getRes.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log(`[Stellar] Confirmed ${method}: ${sendRes.hash}`);
      let returnValue = null;
      if (simTx.result && simTx.result.retval) {
        try {
          returnValue = StellarSdk.scValToNative(simTx.result.retval);
        } catch (e) {
           console.error("Failed to parse retval", e);
        }
      }
      return { hash: sendRes.hash, returnValue };
    } else {
      console.error(`[Stellar] Transaction ${sendRes.hash} failed on-chain`);
      return null;
    }
  } catch (error) {
    console.error(`[Stellar] Error invoking ${method}:`, error);
    return null;
  }
}
