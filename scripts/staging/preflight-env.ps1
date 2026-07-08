$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "Staging Operator Environment Preflight"
Write-Host "=========================================="
Write-Host "WARNING: Do not run migration directly from this script."
Write-Host "This script only verifies presence of required variables and tools."
Write-Host "It does not connect to any remote database."
Write-Host ""

$missing = $false

Write-Host "--- Tooling Check ---"
if (Get-Command "npx" -ErrorAction SilentlyContinue) {
    Write-Host "[PASS] npx is available"
} else {
    Write-Host "[FAIL] npx is missing"
    $missing = $true
}

$supabaseFound = $false
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    Write-Host "[PASS] supabase CLI is available"
    $supabaseFound = $true
} else {
    Write-Host "[WARN] supabase CLI not found in PATH. Checking via npx..."
    # We won't actually execute npx here to avoid download prompts, but we warn the user
    Write-Host "       npx supabase will be required."
    if (Get-Command "npx" -ErrorAction SilentlyContinue) {
        $supabaseFound = $true
    }
}

if (-not $supabaseFound) {
    $missing = $true
}

Write-Host ""
Write-Host "--- Environment Variables Check ---"

$requiredEnv = @(
    "STAGING_DATABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WALLET_ENCRYPTION_KEY",
    "NEXT_PUBLIC_RUNTIME_MODE",
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
        
        # Safe internal value checks without printing the actual value
        if ($name -eq "NEXT_PUBLIC_RUNTIME_MODE") {
            if ($val -ne "persistent") {
                Write-Host "       [!] Error: NEXT_PUBLIC_RUNTIME_MODE is not 'persistent'."
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
    Write-Host "You may proceed with the STAGING_MIGRATION_RUNBOOK.md."
    Write-Host "=========================================="
    exit 0
}
