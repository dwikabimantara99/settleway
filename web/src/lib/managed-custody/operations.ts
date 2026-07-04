import { TransactionBuilder, Operation, Asset, StrKey, Account } from '@stellar/stellar-sdk';
import type { DbDeal } from '@/lib/db/types';
import type { ManagedCustodyConfig } from './config';
import type { StellarRpcPort } from '@/lib/stellar/server/stellar-rpc-port';

const BASE_FEE_STROOPS = 100;
const MAX_TIME_SECONDS = 180;
const XLM_DECIMALS = 1e7;

function convertIdrToXlmBaseUnits(idr: number): string {
  // Simplified mock conversion: 1 XLM = Rp 15.000
  // So IDR amount / 15000 = XLM amount
  // Base units = XLM amount * 10^7
  const xlm = Math.floor(idr / 15000);
  const baseUnits = BigInt(xlm) * BigInt(XLM_DECIMALS);
  return baseUnits.toString();
}

function convertBaseUnitsToXlmString(baseUnits: string): string {
  const num = BigInt(baseUnits);
  const whole = num / BigInt(XLM_DECIMALS);
  const fraction = num % BigInt(XLM_DECIMALS);
  const fractionStr = fraction.toString().padStart(7, '0').replace(/0+$/, '');
  if (fractionStr.length > 0) {
    return `${whole.toString()}.${fractionStr}`;
  }
  return whole.toString();
}

export async function prepareFundingTransaction(input: {
  deal: DbDeal;
  role: 'buyer' | 'seller';
  sourceAddress: string;
  config: ManagedCustodyConfig;
  rpcPort: StellarRpcPort;
}): Promise<{ unsignedXdr: string; expectedAmountXlm: string }> {
  const { deal, role, sourceAddress, config, rpcPort } = input;

  if (!StrKey.isValidEd25519PublicKey(sourceAddress)) {
    throw new Error('Invalid source address.');
  }

  // Calculate required amounts
  const principalBase = BigInt(convertIdrToXlmBaseUnits(deal.principal_idr));
  const buyerBondBase = BigInt(convertIdrToXlmBaseUnits(deal.buyer_bond_idr));
  const sellerBondBase = BigInt(convertIdrToXlmBaseUnits(deal.seller_bond_idr));
  const buyerFeeBase = BigInt(convertIdrToXlmBaseUnits(deal.buyer_fee_idr));
  const sellerFeeBase = BigInt(convertIdrToXlmBaseUnits(deal.seller_fee_idr));

  let totalRequiredBase = BigInt(0);
  if (role === 'buyer') {
    totalRequiredBase = principalBase + buyerBondBase + buyerFeeBase;
  } else {
    totalRequiredBase = sellerBondBase + sellerFeeBase;
  }

  const expectedAmountXlm = convertBaseUnitsToXlmString(totalRequiredBase.toString());

  // Ensure the custody wallet exists
  const custodyAccountResult = await rpcPort.loadSourceAccount(config.custodyWalletPublicKey);
  if (!custodyAccountResult.ok) {
    // If not found, fund it using Friendbot
    try {
      await fetch(`https://friendbot.stellar.org/?addr=${config.custodyWalletPublicKey}`);
    } catch (err) {
      console.warn('Failed to call friendbot for custody wallet', err);
    }
  }

  // Load source account
  const sourceAccountResult = await rpcPort.loadSourceAccount(sourceAddress);
  if (!sourceAccountResult.ok) {
    throw new Error(`Failed to load source account ${sourceAddress} from Stellar network. Ensure it is funded.`);
  }
  
  // Note: we use stellar-sdk Account object to track sequence
  const sourceAccount = new Account(
    sourceAddress,
    sourceAccountResult.sequence
  );

  const txBuilder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE_STROOPS.toString(),
    networkPassphrase: config.networkPassphrase,
  });

  txBuilder.addOperation(
    Operation.payment({
      destination: config.custodyWalletPublicKey,
      asset: Asset.native(),
      amount: expectedAmountXlm,
    })
  );

  txBuilder.setTimeout(MAX_TIME_SECONDS);

  const transaction = txBuilder.build();
  
  return {
    unsignedXdr: transaction.toXDR(),
    expectedAmountXlm,
  };
}
