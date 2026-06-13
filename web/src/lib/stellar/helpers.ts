import * as StellarSdk from '@stellar/stellar-sdk';
import { invokeEscrowMethod, platformAddress } from './escrow-contract';

export async function recordDealCreatedOnChain(deal: any) {
  // deal_hash: BytesN<32>
  const dealHash = Buffer.alloc(32);
  dealHash.write(deal.id.substring(0, 32)); // Pseudo-hash for demo

  // Addresses
  const actor = new StellarSdk.Address(platformAddress);

  const args = [
    StellarSdk.nativeToScVal(dealHash, { type: 'bytesN' }),
    StellarSdk.nativeToScVal(platformAddress, { type: 'address' }), // buyer
    StellarSdk.nativeToScVal(platformAddress, { type: 'address' }), // seller
    StellarSdk.nativeToScVal(deal.principal_idr, { type: 'i128' }),
    StellarSdk.nativeToScVal(deal.buyer_bond_idr, { type: 'i128' }),
    StellarSdk.nativeToScVal(deal.seller_bond_idr, { type: 'i128' }),
    StellarSdk.nativeToScVal(deal.buyer_fee_idr, { type: 'i128' }),
    StellarSdk.nativeToScVal(deal.seller_fee_idr, { type: 'i128' }),
    StellarSdk.nativeToScVal(Math.floor(Date.now() / 1000) + 86400, { type: 'u64' }), // expires in 1 day
  ];

  return await invokeEscrowMethod('create_escrow', args);
}

export async function recordEscrowActionOnChain(escrowId: number | string, method: string, extraArgs: StellarSdk.xdr.ScVal[] = []) {
  if (!escrowId) return null;
  const numId = typeof escrowId === 'string' ? parseInt(escrowId, 10) : escrowId;

  const args = [
    StellarSdk.nativeToScVal(numId, { type: 'u64' }),
    StellarSdk.nativeToScVal(platformAddress, { type: 'address' }), // actor
    ...extraArgs
  ];

  return await invokeEscrowMethod(method, args);
}

export async function submitProofHashOnChain(escrowId: number | string) {
  const dummyHash = Buffer.alloc(32);
  dummyHash.write('SIMULATED_PROOF_HASH_PHASE_8_PND');
  return await recordEscrowActionOnChain(escrowId, 'submit_proof_hash', [
    StellarSdk.nativeToScVal(dummyHash, { type: 'bytesN' })
  ]);
}
