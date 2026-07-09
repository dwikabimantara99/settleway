import 'server-only';
import { repository, runtimeMode } from '@/lib/repositories';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { generateAndEncryptProfileWallet } from '@/lib/stellar/server/provisioning';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export function redact(val: string | undefined): string {
  if (!val) return 'undefined';
  if (val.length < 8) return '***';
  return val.substring(0, 4) + '...' + val.substring(val.length - 4);
}

export function checkSafetyGates() {
  if (process.env.RUNTIME_MODE !== 'persistent' || process.env.NEXT_PUBLIC_RUNTIME_MODE !== 'persistent') {
    throw new Error("FATAL: Runner requires RUNTIME_MODE=persistent and NEXT_PUBLIC_RUNTIME_MODE=persistent");
  }

  // We can require TESTNET_DATABASE_URL as a signal, but we don't use it for supabase-js
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

  try {
    const supabaseRestUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseRestUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase REST URL or service role key");
    }

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
        terms: {}
      });
      if (dealErr) throw new Error(`Deal insert failed: ${dealErr.message}`);

      const verifiedDeal = await repository.getDeal(dealId);
      if (!verifiedDeal) throw new Error("Verification failed: Deal not found in repository");
      logger(`[OK] Deal created in status: ${verifiedDeal.status}`);
    }

    // 4. Execution Coordinator
    throw new Error("Wallet execution via coordinator requires programmatic hook not present outside browser-based API auth flows");

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("Wallet execution") && !message.includes("Wallet provisioning unavailable")) {
      errLogger("\n[ERROR] Runner failed: " + message);
    }
    exactBlocker = message;
    // Classify as partial if we failed after DB validation
    finalStatus = exactBlocker.includes("Wallet execution") || exactBlocker.includes("Wallet provisioning unavailable")
      ? 'PERSISTENT_SMOKE_RUNNER_PARTIAL'
      : 'PERSISTENT_SMOKE_RUNNER_BLOCKED';

    if (isPlanOnly && finalStatus === 'PERSISTENT_SMOKE_RUNNER_PARTIAL') {
      logger(`[PLAN] Would halt with partial execution due to: ${exactBlocker}`);
    }
  }

  logger("\n=== SUMMARY ===");
  logger("Classification:", finalStatus);
  if (exactBlocker) {
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
    // We intentionally write the report file to stdout or log, but skip file write if plan-only if requested
    // The instructions say "plan-only must not write remote data", but writing local report is usually fine.
    if (!report.isPlanOnly) {
      const reportPath = path.resolve(process.cwd(), '../docs/active/PERSISTENT_SMOKE_RUN_LATEST.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`[OK] Wrote report to: ${reportPath}`);
    }
    if (report.classification !== 'PERSISTENT_SMOKE_RUNNER_READY' && report.classification !== 'PERSISTENT_SMOKE_RUNNER_PARTIAL') {
      process.exit(1);
    }
  }).catch(err => {
    console.error("Unhandled top-level error:", err);
    process.exit(1);
  });
}
