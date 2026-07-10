import 'server-only';
import { runtimeMode } from '@/lib/repositories';
import { getAdminSmokeRepository } from '@/lib/stellar/server/smoke/headless-smoke-admin-context';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { generateAndEncryptProfileWallet } from '@/lib/stellar/server/provisioning';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { executeHeadlessSmokeAction } from '@/lib/stellar/server/smoke/headless-execution-hook';
import { fundTestnetWalletViaFriendbot } from '@/lib/stellar/server/smoke/testnet-friendbot';
import crypto from 'node:crypto';

export function redact(val: string | undefined): string {
  if (!val) return 'undefined';
  if (val.length < 8) return '***';
  return val.substring(0, 4) + '...' + val.substring(val.length - 4);
}

export function checkSafetyGates() {
  if (process.env.RUNTIME_MODE !== 'persistent' || process.env.NEXT_PUBLIC_RUNTIME_MODE !== 'persistent') {
    throw new Error("FATAL: Runner requires RUNTIME_MODE=persistent and NEXT_PUBLIC_RUNTIME_MODE=persistent");
  }

  if (!process.env.TESTNET_DATABASE_URL && !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("FATAL: Missing DB configuration signal");
  }

  if (!process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE) {
    throw new Error("FATAL: Missing NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE");
  }
}

export async function runSmoke(logger = console.log, errLogger = console.error) {
  checkSafetyGates();

  const isPlanOnly = process.env.SMOKE_PLAN_ONLY === '1';

  logger("=== TESTNET PERSISTENT SMOKE RUNNER ===");
  logger("Mode:", runtimeMode);
  logger("Plan Only:", isPlanOnly ? "YES" : "NO");

  const timestamp = Date.now();
  const buyerId = `smoke_buyer_${timestamp}`;
  const sellerId = `smoke_seller_${timestamp}`;
  const dealId = `smoke_deal_${timestamp}`;

  let finalStatus = 'PERSISTENT_SMOKE_RUNNER_BLOCKED';
  let exactBlocker = '';

  const repository = getAdminSmokeRepository();

  try {
    const supabaseRestUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseRestUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase REST URL or service role key");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseAdmin: any = null;
    if (!isPlanOnly) {
      supabaseAdmin = createClient(supabaseRestUrl, serviceRoleKey);
    }

    // 1. Profile Creation
    logger(`[1] Creating smoke profiles... (buyer: ${buyerId}, seller: ${sellerId})`);

    if (isPlanOnly) {
      logger(`[PLAN] Would create profiles in Supabase`);
    } else {
      const { error: profileErr } = await supabaseAdmin.from('profiles').insert([
        { id: buyerId, display_name: `Smoke Buyer ${timestamp}`, role_label: 'Buyer', user_type: 'buyer' },
        { id: sellerId, display_name: `Smoke Seller ${timestamp}`, role_label: 'Seller', user_type: 'seller' }
      ]);
      if (profileErr) throw new Error(`Profile insert failed: ${profileErr.message}`);

      const verifiedBuyer = await repository.getProfile(buyerId);
      if (!verifiedBuyer) throw new Error("Verification failed: Buyer profile not found in repository");
      logger(`[OK] Profiles created and verified.`);
    }

    // 2. Wallet Provisioning
    logger(`[2] Provisioning server-side profile wallets...`);

    if (!process.env.WALLET_ENCRYPTION_KEY) {
       throw new Error("Wallet provisioning unavailable (missing WALLET_ENCRYPTION_KEY)");
    }

    if (isPlanOnly) {
      logger(`[PLAN] Would provision wallets server-side`);
    } else {
      const walletRepo = getServerWalletRepository();
      const bWalletDb = generateAndEncryptProfileWallet(buyerId);
      await walletRepo.provisionProfileWallet(bWalletDb);
      const verifiedBuyerWallet = await walletRepo.getProfileWallet(buyerId);
      if (!verifiedBuyerWallet) throw new Error("Verification failed: Buyer wallet not found after provisioning");
      logger(`[OK] Buyer wallet provisioned: ${redact(verifiedBuyerWallet.public_address)}`);

      const sWalletDb = generateAndEncryptProfileWallet(sellerId);
      await walletRepo.provisionProfileWallet(sWalletDb);
      const verifiedSellerWallet = await walletRepo.getProfileWallet(sellerId);
      if (!verifiedSellerWallet) throw new Error("Verification failed: Seller wallet not found after provisioning");
      logger(`[OK] Seller wallet provisioned: ${redact(verifiedSellerWallet.public_address)}`);
    }

    // 3. Deal Creation
    logger(`[3] Creating smoke deal... (dealId: ${dealId})`);

    if (isPlanOnly) {
      logger(`[PLAN] Would create deal record`);
    } else {
      const { error: dealErr } = await supabaseAdmin.from('deals').insert({
        id: dealId,
        buyer_id: buyerId,
        seller_id: sellerId,
        commodity: 'Smoke Test Commodity',
        volume_kg: 100,
        principal_idr: 100000,
        buyer_bond_idr: 10000,
        seller_bond_idr: 10000,
        buyer_fee_idr: 250,
        seller_fee_idr: 250,
        buyer_total_idr: 110250,
        seller_total_idr: 10250,
        status: 'WAITING_DEPOSITS',
        stellar_mode: 'testnet',
        stellar_contract_id: null,
        stellar_escrow_id: null,
        latest_stellar_tx_hash: null,
        stellar_sync_status: 'synced',
        terms: {
           deposit_deadline_at: new Date(Date.now() + 86400 * 1000).toISOString()
        }
      });
      if (dealErr) throw new Error(`Deal insert failed: ${dealErr.message}`);

      const verifiedDeal = await repository.getDeal(dealId);
      if (!verifiedDeal) throw new Error("Verification failed: Deal not found in repository");
      logger(`[OK] Deal created in status: ${verifiedDeal.status}`);
    }

    // 3.5. Friendbot Funding
    if (isPlanOnly) {
      logger(`[PLAN] Would fund smoke wallets via Friendbot`);
    } else if (process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION === '1') {
      logger(`[3.5] Funding newly provisioned wallets via Friendbot...`);
      const walletRepo = getServerWalletRepository();
      const verifiedBuyerWallet = await walletRepo.getProfileWallet(buyerId);
      const verifiedSellerWallet = await walletRepo.getProfileWallet(sellerId);

      const buyerFundRes = await fundTestnetWalletViaFriendbot(verifiedBuyerWallet!.public_address);
      if (!buyerFundRes.ok) {
        finalStatus = 'PERSISTENT_SMOKE_RUNNER_BLOCKED_BALANCE';
        exactBlocker = `Friendbot funding failed for buyer: ${buyerFundRes.message}`;
        throw new Error(exactBlocker);
      }
      logger(`[OK] Buyer wallet funded via Friendbot (addr: ${buyerFundRes.redactedAddress})`);

      const sellerFundRes = await fundTestnetWalletViaFriendbot(verifiedSellerWallet!.public_address);
      if (!sellerFundRes.ok) {
        finalStatus = 'PERSISTENT_SMOKE_RUNNER_BLOCKED_BALANCE';
        exactBlocker = `Friendbot funding failed for seller: ${sellerFundRes.message}`;
        throw new Error(exactBlocker);
      }
      logger(`[OK] Seller wallet funded via Friendbot (addr: ${sellerFundRes.redactedAddress})`);
    }

    // 4. Execution Coordinator
    if (isPlanOnly) {
      logger(`[PLAN] Would attempt headless execution orchestration if enabled`);
      throw new Error("Wallet execution via coordinator requires programmatic hook not present outside browser-based API auth flows");
    }

    if (process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION !== '1') {
       throw new Error("Wallet execution via coordinator requires programmatic hook not present outside browser-based API auth flows");
    }

    logger(`[4] Executing headless coordinator sequences...`);

    const buyerResult = await executeHeadlessSmokeAction({
      dealId,
      actorId: buyerId,
      expectedRole: 'buyer',
      action: 'buyer_deposit'
    });

    if (!buyerResult.ok) {
       const blocker = buyerResult.blocker || "Unknown error";
       if (blocker.includes("Insufficient balance") || blocker.includes("network unavailable")) {
         finalStatus = 'PERSISTENT_SMOKE_RUNNER_BLOCKED_BALANCE';
         exactBlocker = blocker;
       }
       throw new Error(`Headless buyer deposit failed: ${blocker}`);
    }
    logger(`[OK] Buyer deposit submitted (status: ${buyerResult.nextDealStatus})`);

    const sellerResult = await executeHeadlessSmokeAction({
      dealId,
      actorId: sellerId,
      expectedRole: 'seller',
      action: 'seller_deposit'
    });

    if (!sellerResult.ok) {
       const blocker = sellerResult.blocker || "Unknown error";
       if (blocker.includes("Insufficient balance") || blocker.includes("network unavailable")) {
         finalStatus = 'PERSISTENT_SMOKE_RUNNER_BLOCKED_BALANCE';
         exactBlocker = blocker;
       }
       throw new Error(`Headless seller deposit failed: ${blocker}`);
    }
    logger(`[OK] Seller deposit submitted (status: ${sellerResult.nextDealStatus})`);

    // 5. Submit Proof
    logger(`[5] Submitting proof of delivery...`);
    
    // Deterministic fake payload hash
    const fakeProofPayload = `proof:delivery_note:timestamp_${timestamp}:deal_${dealId}`;
    const fakeProofHash = crypto.createHash('sha256').update(fakeProofPayload).digest('hex');

    const proofResult = await executeHeadlessSmokeAction({
      dealId,
      actorId: sellerId,
      expectedRole: 'seller',
      action: 'submit_proof',
      proofHash: fakeProofHash
    });

    if (!proofResult.ok) {
       const blocker = proofResult.blocker || "Unknown error";
       throw new Error(`Headless submit proof failed: ${blocker}`);
    }
    logger(`[OK] Proof submitted (status: ${proofResult.nextDealStatus})`);

    // 6. Mark Delivered
    logger(`[6] Marking delivered...`);
    const deliverResult = await executeHeadlessSmokeAction({
      dealId,
      actorId: sellerId,
      expectedRole: 'seller',
      action: 'mark_delivered'
    });

    if (!deliverResult.ok) {
       const blocker = deliverResult.blocker || "Unknown error";
       throw new Error(`Headless mark delivered failed: ${blocker}`);
    }
    logger(`[OK] Delivery marked (status: ${deliverResult.nextDealStatus})`);

    // 7. Accept Delivery
    logger(`[7] Accepting delivery (Settlement)...`);
    const acceptResult = await executeHeadlessSmokeAction({
      dealId,
      actorId: buyerId,
      expectedRole: 'buyer',
      action: 'accept_delivery'
    });

    if (!acceptResult.ok) {
       const blocker = acceptResult.blocker || "Unknown error";
       throw new Error(`Headless accept delivery failed: ${blocker}`);
    }
    logger(`[OK] Delivery accepted & Settlement confirmed (status: ${acceptResult.nextDealStatus})`);

    // If we reach here, full lifecycle succeeded
    finalStatus = 'FULL_LIFECYCLE_LOCAL_SMOKE_SUCCEEDED';
    exactBlocker = '';

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("Wallet execution") && !message.includes("Wallet provisioning unavailable") && !message.includes("Headless hook requires RUNTIME_MODE=persistent")) {
      errLogger("\n[ERROR] Runner failed: " + message);
    }
    exactBlocker = message;

    if (exactBlocker.includes("Wallet execution") || exactBlocker.includes("Wallet provisioning unavailable")) {
      finalStatus = 'PERSISTENT_SMOKE_RUNNER_PARTIAL';
    } else if (exactBlocker.includes("Friendbot funding failed") || exactBlocker.includes("Insufficient balance") || exactBlocker.includes("network unavailable")) {
      finalStatus = 'PERSISTENT_SMOKE_RUNNER_BLOCKED_BALANCE';
    } else {
      finalStatus = 'PERSISTENT_SMOKE_RUNNER_BLOCKED';
    }

    if (isPlanOnly && finalStatus === 'PERSISTENT_SMOKE_RUNNER_PARTIAL') {
      logger(`[PLAN] Would halt with partial execution due to: ${exactBlocker}`);
    }
  }

  logger("\n=== SUMMARY ===");
  logger("Classification:", finalStatus);
  if (exactBlocker && finalStatus !== 'FULL_LIFECYCLE_LOCAL_SMOKE_SUCCEEDED') {
    logger("Blocker:", exactBlocker);
  }

  // Generate output
  const report = {
    timestamp: new Date().toISOString(),
    classification: finalStatus,
    dealId,
    buyerId,
    sellerId,
    blocker: exactBlocker,
    isPlanOnly
  };

  return report;
}

if (typeof require !== 'undefined' && require.main === module) {
  runSmoke().then(report => {
    if (!report.isPlanOnly) {
      const reportPath = path.resolve(process.cwd(), '../docs/active/FULL_LIFECYCLE_SMOKE_RUN_LATEST.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`[OK] Wrote report to: ${reportPath}`);
    }
    if (report.classification !== 'FULL_LIFECYCLE_LOCAL_SMOKE_SUCCEEDED' &&
        report.classification !== 'FULL_LIFECYCLE_SMOKE_PARTIAL') {
      process.exit(1);
    }
  }).catch(err => {
    console.error("Unhandled top-level error:", err);
    process.exit(1);
  });
}
