$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "Testnet Persistent DB Operator Preflight"
Write-Host "=========================================="
Write-Host "Target: TESTNET_PERSISTENT_DB."
Write-Host "This may currently be the Supabase main project by owner approval."
Write-Host "Do not use this for real-money production or Stellar mainnet."
Write-Host "WARNING: Do not run migration directly from this script."
Write-Host "This script only verifies presence of required variables and tools."
Write-Host "It does not connect to any remote database."
Write-Host ""

$missing = $false

Write-Host "--- Tooling Check ---"
$supabaseFound = $false

if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    try {
        $out = supabase --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $out -match "^\d") {
            Write-Host "[PASS] global supabase CLI is available and successfully executable"
            $supabaseFound = $true
        }
    } catch {
        # ignore error, try npx
    }
}

if (-not $supabaseFound) {
    if (Get-Command "npx" -ErrorAction SilentlyContinue) {
        Write-Host "Checking npx supabase --version..."
        try {
            $out = npx supabase --version 2>&1
            if ($LASTEXITCODE -eq 0 -or $out -match "^\d") {
                Write-Host "[PASS] npx supabase CLI is available and successfully executable"
                $supabaseFound = $true
            } else {
                Write-Host "[FAIL] npx supabase is present but execution failed."
            }
        } catch {
            Write-Host "[FAIL] npx supabase execution failed."
        }
    } else {
        Write-Host "[FAIL] Both global supabase and npx are missing."
    }
}

if (-not $supabaseFound) {
    $missing = $true
}

Write-Host ""
Write-Host "--- Environment Variables Check ---"

$valTestnetDB = [Environment]::GetEnvironmentVariable("TESTNET_DATABASE_URL")
$valStagingDB = [Environment]::GetEnvironmentVariable("STAGING_DATABASE_URL")

if (-not [string]::IsNullOrWhiteSpace($valTestnetDB)) {
    Write-Host "[PASS] Present: TESTNET_DATABASE_URL"
} elseif (-not [string]::IsNullOrWhiteSpace($valStagingDB)) {
    Write-Host "[WARN] Present: STAGING_DATABASE_URL (Using as legacy alias for TESTNET_DATABASE_URL)"
} else {
    Write-Host "[FAIL] Missing: TESTNET_DATABASE_URL (or STAGING_DATABASE_URL alias)"
    $missing = $true
}

$requiredEnv = @(
    "SUPABASE_SERVICE_ROLE_KEY",
    "WALLET_ENCRYPTION_KEY",
    "NEXT_PUBLIC_RUNTIME_MODE",
    "RUNTIME_MODE",
    "NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE",
    "NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID",
    "CUSTODY_V2_STELLAR_RPC_URL"
)

foreach ($name in $requiredEnv) {
    $val = [Environment]::GetEnvironmentVariable($name)
    if ([string]::IsNullOrWhiteSpace($val)) {
        Write-Host "[FAIL] Missing: $name"
        $missing = $true
    } else {
        Write-Host "[PASS] Present: $name"
        
        if ($name -eq "NEXT_PUBLIC_RUNTIME_MODE" -or $name -eq "RUNTIME_MODE") {
            if ($val -ne "persistent") {
                Write-Host "       [!] Error: $name is not 'persistent'."
                $missing = $true
            }
        }
        
        if ($name -eq "NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE") {
            if ($val -notmatch "Test SDF Network") {
                Write-Host "       [!] Error: Network Passphrase does not appear to be Stellar Testnet."
                $missing = $true
            }
        }
    }
}

Write-Host ""
if ($missing) {
    Write-Host "=========================================="
    Write-Host "STATUS: BLOCKED"
    Write-Host "Operator environment is NOT ready."
    Write-Host "Please provision the missing variables/tools securely."
    Write-Host "=========================================="
    exit 1
} else {
    Write-Host "=========================================="
    Write-Host "STATUS: READY"
    Write-Host "Operator environment checks passed."
    Write-Host "You may proceed with docs/active/STAGING_MIGRATION_RUNBOOK.md (Controlled Migration Runbook for TESTNET_PERSISTENT_DB)."
    Write-Host "=========================================="
    exit 0
}
