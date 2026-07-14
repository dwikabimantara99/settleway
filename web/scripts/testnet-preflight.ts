/* eslint-disable */
/**
 * testnet-preflight.ts
 *
 * Production build preflight — executed as part of `npm run preflight:production`.
 * This script runs INSIDE the Vercel Production build container where all
 * Production environment variables (including secrets) are available.
 *
 * SAFETY PROPERTIES:
 *   - Performs no database write
 *   - Submits no transaction
 *   - Creates no contract state
 *   - Calls no Friendbot endpoint
 *   - Prints no environment-variable values
 *   - Prints no secret-derived metadata (keys, hashes, fragments, lengths)
 *   - Returns only sanitized check names and READY/BLOCKED
 *   - Exits nonzero (code 1) when any check is BLOCKED
 *
 * Required env: VERCEL_ENV=production (enforced when integrated into build)
 */

import { createClient } from '@supabase/supabase-js';
import { Horizon, rpc, Networks } from '@stellar/stellar-sdk';
import crypto from 'crypto';

// ────────────────────────────────────────────────────────────────────────────
// Authoritative configuration (constants, not from env to prevent tampering)
// ────────────────────────────────────────────────────────────────────────────

const AUTHORITATIVE_CUSTODY_CONTRACT_ID = 'CB2OCALATBG5V2XLWHHCVAJNWUSLEUZYJJUVQSLV3O3H72MNADAQCHMN';
const AUTHORITATIVE_WASM_HASH = '029549ed67a3778e259481f26416eccd197f677e8477784d609ac8705e605c37';
const EXPECTED_NETWORK_PASSPHRASE = Networks.TESTNET; // 'Test SDF Network ; September 2015'
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const BANNED_CONTRACT_IDS = [
  'CDI2YXSICZLNX7M3FBLEFBTQHXAV76YO5PVLFQ6LQLBCA5Q3KKUY5QXN', // incorrect old CDI2
  'CAGCSRJYCNYKC5BT2C7ZNHXHVMEHNJSJQPWZRFMFFRYCDSKHD6SREJKX', // legacy escrow
];
const KNOWN_ACTOR_IDS = ['buyer-surabaya-restaurant', 'seller-probolinggo-cabai'];
const VERSION_V1 = 'aes-256-gcm-v1';
const VERSION_V2 = 'aes-256-gcm-v2';
const ALGORITHM = 'aes-256-gcm';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────────────────────────────────────────
// Check result types
// ────────────────────────────────────────────────────────────────────────────

type CheckStatus = 'PASS' | 'FAIL';

interface CheckResult {
  check: string;
  status: CheckStatus;
  reason?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers — never echo values
// ────────────────────────────────────────────────────────────────────────────

function isPresent(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function loadKey(envVar: string): Buffer | null {
  const hexKey = process.env[envVar];
  if (!hexKey || hexKey.trim() === '') return null;
  try {
    const buf = Buffer.from(hexKey.trim(), 'hex');
    if (buf.length !== 32) return null;
    return buf;
  } catch {
    return null;
  }
}

function gcmDecrypt(blob: string, key: Buffer): string {
  const parts = blob.split(':');
  if (parts.length !== 3) throw new Error('Invalid blob format');
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let dec = decipher.update(encryptedHex, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

// ────────────────────────────────────────────────────────────────────────────
// Preflight checks
// ────────────────────────────────────────────────────────────────────────────

async function runPreflight(): Promise<void> {
  const checks: CheckResult[] = [];
  let blocking = false;

  function pass(check: string): void {
    checks.push({ check, status: 'PASS' });
  }

  function fail(check: string, reason: string): void {
    checks.push({ check, status: 'FAIL', reason });
    blocking = true;
  }

  // ── 1. Vercel environment mode ─────────────────────────────────
  const vercelEnv = process.env.VERCEL_ENV;
  if (isPresent(vercelEnv)) {
    pass('vercel_env_present');
  } else {
    // Not blocking in local/CLI execution — only warn
    checks.push({ check: 'vercel_env_present', status: 'FAIL', reason: 'VERCEL_ENV not set (expected in build container)' });
    // Do not set blocking here — allow local operator runs
  }

  // ── 2. Required secret environment variables ───────────────────
  if (!isPresent(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    fail('supabase_service_role_key_present', 'SUPABASE_SERVICE_ROLE_KEY is absent or empty');
  } else {
    pass('supabase_service_role_key_present');
  }

  if (!isPresent(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    fail('supabase_url_present', 'NEXT_PUBLIC_SUPABASE_URL is absent or empty');
  } else {
    pass('supabase_url_present');
  }

  // ── 3. Wallet encryption key presence ─────────────────────────
  const currentKey = loadKey('WALLET_ENCRYPTION_KEY');
  if (!currentKey) {
    fail('wallet_encryption_key_current_valid', 'WALLET_ENCRYPTION_KEY is absent, empty, or not 32 bytes');
  } else {
    pass('wallet_encryption_key_current_valid');
  }

  // Legacy key: required during migration window if any v1 rows exist
  // After migration completes, this check will be informational only
  const legacyKey = loadKey('WALLET_ENCRYPTION_KEY_LEGACY');
  // We do NOT fail if legacy is absent — it's removed after migration completes
  // But we record whether it's present for the migration status report
  checks.push({
    check: 'wallet_encryption_key_legacy_present',
    status: legacyKey ? 'PASS' : 'FAIL',
    reason: legacyKey ? undefined : 'WALLET_ENCRYPTION_KEY_LEGACY absent (expected during migration, ok post-migration)',
  });

  // ── 4. Authoritative contract configuration ────────────────────
  const configuredContractId = process.env.NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID;
  if (!isPresent(configuredContractId)) {
    fail('custody_contract_id_present', 'NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID is absent or empty');
  } else if (configuredContractId!.trim() !== AUTHORITATIVE_CUSTODY_CONTRACT_ID) {
    fail(
      'custody_contract_id_authoritative',
      `Configured contract ID does not match the authoritative CB2 contract`,
    );
  } else {
    pass('custody_contract_id_present');
    pass('custody_contract_id_authoritative');
  }

  // ── 5. Banned contract IDs must not be configured ─────────────
  for (const bannedId of BANNED_CONTRACT_IDS) {
    if (configuredContractId?.trim() === bannedId) {
      fail('custody_contract_id_not_banned', `Configured contract matches a banned/incorrect contract ID`);
      break;
    }
  }
  if (!checks.find(c => c.check === 'custody_contract_id_not_banned')) {
    pass('custody_contract_id_not_banned');
  }

  // ── 6. Smoke env presence ──────────────────────────────────────
  const smokeVars = [
    'SETTLEWAY_SMOKE_RPC_URL',
    'SETTLEWAY_SMOKE_NETWORK_PASSPHRASE',
    'SETTLEWAY_SMOKE_BASE_FEE_STROOPS',
    'SETTLEWAY_SMOKE_MAX_FEE_STROOPS',
    'SETTLEWAY_SMOKE_TIMEOUT_SECONDS',
    'SETTLEWAY_SMOKE_ADMIN_ADDRESS',
    'SETTLEWAY_SMOKE_BUYER_DEMO_ADDRESS',
    'SETTLEWAY_SMOKE_SELLER_DEMO_ADDRESS',
  ];
  const missingSmoke = smokeVars.filter(v => !isPresent(process.env[v]));
  if (missingSmoke.length > 0) {
    fail('smoke_env_present', `Missing: ${missingSmoke.join(', ')}`);
  } else {
    pass('smoke_env_present');
  }

  // ── 7. Network passphrase ──────────────────────────────────────
  const passphrase = process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE;
  if (passphrase && passphrase.trim() !== EXPECTED_NETWORK_PASSPHRASE) {
    fail('network_passphrase_testnet', 'Network passphrase does not match Testnet');
  } else if (passphrase) {
    pass('network_passphrase_testnet');
  }

  // ── 8. Supabase connectivity ───────────────────────────────────
  if (
    isPresent(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isPresent(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      );

      // ── 9. Required table reads ──────────────────────────────
      const { error: profilesError } = await sb.from('profiles').select('id').limit(1);
      if (profilesError) {
        fail('supabase_table_profiles', `profiles table read failed: ${profilesError.message}`);
      } else {
        pass('supabase_table_profiles');
      }

      const { error: walletsError } = await sb.from('user_wallets').select('user_id').limit(1);
      if (walletsError) {
        fail('supabase_table_user_wallets', `user_wallets table read failed: ${walletsError.message}`);
      } else {
        pass('supabase_table_user_wallets');
      }

      const { error: dealsError } = await sb.from('deals').select('id').limit(1);
      if (dealsError) {
        fail('supabase_table_deals', `deals table read failed: ${dealsError.message}`);
      } else {
        pass('supabase_table_deals');
      }

      const { error: custodyLinksError } = await sb.from('custody_deal_links').select('application_deal_id').limit(1);
      if (custodyLinksError) {
        fail('supabase_table_custody_deal_links', `custody_deal_links table read failed: ${custodyLinksError.message}`);
      } else {
        pass('supabase_table_custody_deal_links');
      }

      const { error: custodyOpsError } = await sb.from('custody_operations').select('operation_id').limit(1);
      if (custodyOpsError) {
        fail('supabase_table_custody_operations', `custody_operations table read failed: ${custodyOpsError.message}`);
      } else {
        pass('supabase_table_custody_operations');
      }

      pass('supabase_connectivity');

      // ── 10. Wallet records and decryption checks ─────────────
      if (currentKey) {
        const { data: wallets, error: walletLoadError } = await sb
          .from('user_wallets')
          .select('user_id, public_address, encrypted_secret_key, encryption_version')
          .in('user_id', KNOWN_ACTOR_IDS);

        if (walletLoadError) {
          fail('wallet_records_readable', `Failed to read wallet records: ${walletLoadError.message}`);
        } else if (!wallets || wallets.length < KNOWN_ACTOR_IDS.length) {
          fail('wallet_records_readable', `Expected ${KNOWN_ACTOR_IDS.length} actor wallets, found ${wallets?.length ?? 0}`);
        } else {
          pass('wallet_records_readable');

          // ── 11. Wallet encryption version audit ────────────────
          // Fetch counts
          const { count: countV1 } = await sb
            .from('user_wallets')
            .select('*', { count: 'exact', head: true })
            .eq('encryption_version', VERSION_V1);
          const { count: countV2 } = await sb
            .from('user_wallets')
            .select('*', { count: 'exact', head: true })
            .eq('encryption_version', VERSION_V2);

          if ((countV1 ?? 0) > 0 && !legacyKey) {
            fail(
              'wallet_v1_records_need_legacy_key',
              `${countV1} v1 wallet rows exist but WALLET_ENCRYPTION_KEY_LEGACY is absent`,
            );
          } else {
            // countV2 is informational — log if zero as a sanity check
            if ((countV2 ?? 0) === 0 && (countV1 ?? 0) === 0) {
              fail('wallet_v1_records_need_legacy_key', 'No wallet rows found in user_wallets');
            } else {
              pass('wallet_v1_records_need_legacy_key');
            }
          }

          // ── 12. Decrypt and verify known actor wallets ─────────
          let allActorsValid = true;
          for (const wallet of wallets) {
            const version: string = wallet.encryption_version;
            let keyToUse: Buffer | null = null;

            if (version === VERSION_V2) {
              keyToUse = currentKey;
            } else if (version === VERSION_V1) {
              keyToUse = legacyKey;
            }

            if (!keyToUse) {
              fail(
                `wallet_decrypt_${wallet.user_id}`,
                `No key available for version ${version}`,
              );
              allActorsValid = false;
              continue;
            }

            try {
              const { Keypair } = await import('@stellar/stellar-sdk');
              const secret = gcmDecrypt(wallet.encrypted_secret_key, keyToUse);
              const derived = Keypair.fromSecret(secret).publicKey();
              if (derived !== wallet.public_address) {
                fail(
                  `wallet_public_key_match_${wallet.user_id}`,
                  `Derived public key does not match stored address`,
                );
                allActorsValid = false;
              } else {
                pass(`wallet_decrypt_${wallet.user_id}`);
                pass(`wallet_public_key_match_${wallet.user_id}`);
              }
            } catch {
              fail(
                `wallet_decrypt_${wallet.user_id}`,
                `Decryption failed for ${wallet.user_id}`,
              );
              allActorsValid = false;
            }
          }

          if (allActorsValid) {
            pass('all_actor_wallets_valid');
          }
        }
      }
    } catch (e: unknown) {
      fail('supabase_connectivity', `Unexpected error: ${(e as Error).message}`);
    }
  }

  // ── 13. Horizon Testnet connectivity ───────────────────────────
  try {
    const horizon = new Horizon.Server(HORIZON_URL);
    const root = await horizon.root();
    // horizon_version should be present
    if (!root) {
      fail('horizon_testnet_connectivity', 'Horizon returned no response');
    } else {
      pass('horizon_testnet_connectivity');
    }
  } catch (e: unknown) {
    fail('horizon_testnet_connectivity', `Horizon error: ${(e as Error).message}`);
  }

  // ── 14. Soroban RPC connectivity ───────────────────────────────
  try {
    const rpcServer = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
    const health = await rpcServer.getHealth();
    if (!health || health.status !== 'healthy') {
      fail('soroban_rpc_connectivity', `RPC unhealthy: ${health?.status}`);
    } else {
      pass('soroban_rpc_connectivity');
    }
  } catch (e: unknown) {
    fail('soroban_rpc_connectivity', `Soroban RPC error: ${(e as Error).message}`);
  }

  // ── 15. Authoritative contract existence and Wasm hash ─────────
  try {
    const rpcServer = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
    const { xdr, StrKey } = await import('@stellar/stellar-sdk');

    // Read contract instance ledger entry to verify existence
    const contractIdBytes = StrKey.decodeContract(AUTHORITATIVE_CUSTODY_CONTRACT_ID);
    const instanceKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contract: xdr.ScAddress.scAddressTypeContract(contractIdBytes as any),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const result = await rpcServer.getLedgerEntries(instanceKey);
    if (!result.entries || result.entries.length === 0) {
      fail('custody_contract_exists', 'Contract instance not found on Testnet');
    } else {
      pass('custody_contract_exists');

      // entry.val is already a parsed xdr.LedgerEntryData (not a raw xdr string)
      const entry = result.entries[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entryVal = (entry as any).val;
      const contractData = entryVal.contractData();
      const val = contractData.val();

      if (val.switch().name === 'scvContractInstance') {
        const instance = val.instance();
        const executableType = instance.executable().switch().name;

        if (executableType === 'contractExecutableWasm') {
          const rawHash = instance.executable().wasmHash();
          const wasmHash = Buffer.from(rawHash).toString('hex');
          if (wasmHash === AUTHORITATIVE_WASM_HASH) {
            pass('custody_contract_wasm_hash_match');
          } else {
            fail('custody_contract_wasm_hash_match', `Wasm hash does not match the approved authoritative hash`);
          }
        } else {
          fail('custody_contract_wasm_hash_match', `Unexpected executable type: ${executableType}`);
        }
      } else {
        fail('custody_contract_wasm_hash_match', `Unexpected contract data value type`);
      }
    }
  } catch (e: unknown) {
    fail('custody_contract_exists', `Contract read error: ${(e as Error).message}`);
  }


  // ── 16. Mock fallback prevention ───────────────────────────────
  const runtimeMode = process.env.NEXT_PUBLIC_RUNTIME_MODE;
  if (runtimeMode === 'mock_only') {
    fail('no_mock_fallback', 'NEXT_PUBLIC_RUNTIME_MODE=mock_only is set — production must not use mock');
  } else {
    pass('no_mock_fallback');
  }

  // ── Report ─────────────────────────────────────────────────────
  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL');

  console.log(
    JSON.stringify(
      {
        status: blocking ? 'BLOCKED' : 'READY',
        passed,
        failed: failed.length,
        checks: checks.map(c =>
          c.status === 'FAIL'
            ? { check: c.check, status: c.status, reason: c.reason }
            : { check: c.check, status: c.status }
        ),
      },
      null,
      2,
    ),
  );

  if (blocking) {
    process.exit(1);
  }
}

runPreflight().catch(err => {
  console.error('PREFLIGHT FATAL:', err.message);
  process.exit(1);
});
