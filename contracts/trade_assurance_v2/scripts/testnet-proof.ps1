param(
    [ValidateSet("Plan", "DeployInitialize", "SuccessScenario", "ExpiryScenario")]
    [string] $Scenario = "Plan",
    [switch] $Execute,
    [string] $Network = "testnet",
    [string] $ConfigDir = "",
    [string] $SourceAlias = "",
    [string] $BuyerAlias = "",
    [string] $SellerAlias = "",
    [string] $AcceptedAssetContractId = "",
    [string] $ContractId = "",
    [string] $ContractAlias = "settleway-trade-assurance-v2",
    [string] $WasmPath = "target\wasm32v1-none\release\trade_assurance_v2.wasm",
    [int64] $PolicyVersion = 1,
    [int64] $Principal = 10000000,
    [int64] $BuyerBond = 500000,
    [int64] $SellerBond = 500000,
    [int64] $FundingDeadline = 0,
    [int64] $DeliveryDeadline = 0,
    [int64] $InspectionDeadline = 0
)

$ErrorActionPreference = "Stop"

function Assert-NoSecretLikeValue {
    param([string] $Name, [string] $Value)
    if ($Value -match "^S[A-Z0-9]{55}$") {
        throw "$Name looks like a Stellar secret key. Use a local Stellar CLI alias or public address only."
    }
}

function Assert-Required {
    param([string] $Name, [string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "$Name is required for scenario '$Scenario'."
    }
}

function Invoke-Or-Print {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]] $CommandArgs)
    $globalArgs = @()
    if (-not [string]::IsNullOrWhiteSpace($ConfigDir)) {
        $globalArgs = @("--config-dir", $ConfigDir)
    }
    $allArgs = $globalArgs + $CommandArgs
    $display = "stellar " + ($allArgs -join " ")
    if (-not $Execute) {
        Write-Host "[dry-run] $display"
        return
    }
    Write-Host "[execute] $display"
    & stellar @allArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Stellar CLI command failed with exit code $LASTEXITCODE."
    }
}

function Deal-Id {
    param([string] $Seed)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Seed)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha256.ComputeHash($bytes)
        return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
    }
    finally {
        $sha256.Dispose()
    }
}

function Unix-Now {
    return [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
}

foreach ($pair in @(
    @("SourceAlias", $SourceAlias),
    @("BuyerAlias", $BuyerAlias),
    @("SellerAlias", $SellerAlias),
    @("AcceptedAssetContractId", $AcceptedAssetContractId),
    @("ContractId", $ContractId)
)) {
    Assert-NoSecretLikeValue -Name $pair[0] -Value $pair[1]
}

if ($FundingDeadline -eq 0) {
    $FundingDeadline = [DateTimeOffset]::UtcNow.AddHours(2).ToUnixTimeSeconds()
}
if ($DeliveryDeadline -eq 0) {
    $DeliveryDeadline = [DateTimeOffset]::UtcNow.AddDays(2).ToUnixTimeSeconds()
}
if ($InspectionDeadline -eq 0) {
    $InspectionDeadline = [DateTimeOffset]::UtcNow.AddDays(3).ToUnixTimeSeconds()
}

$termsHash = Deal-Id "settleway-v2-terms-proof"
$successDealId = Deal-Id "settleway-v2-success-proof"
$expiryDealId = Deal-Id "settleway-v2-expiry-proof"
$evidenceHash = Deal-Id "settleway-v2-evidence-proof"

Write-Host "Scenario: $Scenario"
Write-Host "Mode: $(if ($Execute) { "execute" } else { "dry-run" })"
Write-Host "Network: $Network"
Write-Host "This script never accepts or prints Stellar secret keys."

if ($Scenario -eq "Plan") {
    Write-Host ""
    Write-Host "1. Build Wasm: cargo build --workspace --target wasm32v1-none --release"
    Write-Host "2. Select asset contract id, for native XLM SAC: stellar contract id asset --asset native --network $Network"
    Write-Host "3. Deploy and initialize: rerun this script with -Scenario DeployInitialize and required aliases."
    Write-Host "4. Run SuccessScenario with buyer/seller funded accounts and the deployed contract id."
    Write-Host "5. Run ExpiryScenario with a short funding deadline and only one funded side."
    exit 0
}

if ($Scenario -eq "DeployInitialize") {
    Assert-Required "SourceAlias" $SourceAlias
    Assert-Required "AcceptedAssetContractId" $AcceptedAssetContractId
    if (-not (Test-Path -LiteralPath $WasmPath)) {
        throw "WasmPath does not exist: $WasmPath"
    }
    Invoke-Or-Print -CommandArgs @(
        "contract", "deploy",
        "--wasm", $WasmPath,
        "--source-account", $SourceAlias,
        "--network", $Network,
        "--alias", $ContractAlias
    )
    Write-Host "After deployment, set -ContractId to the returned contract id if your CLI does not resolve alias '$ContractAlias'."
    $targetId = if ([string]::IsNullOrWhiteSpace($ContractId)) { $ContractAlias } else { $ContractId }
    Invoke-Or-Print -CommandArgs @(
        "contract", "invoke",
        "--id", $targetId,
        "--source-account", $SourceAlias,
        "--network", $Network,
        "--",
        "initialize",
        "--initializer", $SourceAlias,
        "--accepted_asset", $AcceptedAssetContractId,
        "--policy_version", "$PolicyVersion"
    )
    exit 0
}

Assert-Required "ContractId" $ContractId
Assert-Required "BuyerAlias" $BuyerAlias
Assert-Required "SellerAlias" $SellerAlias

if ($Scenario -eq "SuccessScenario") {
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "create_deal", "--deal_id", $successDealId, "--creator", $BuyerAlias, "--buyer", $BuyerAlias, "--seller", $SellerAlias, "--terms_hash", $termsHash, "--principal", "$Principal", "--buyer_bond", "$BuyerBond", "--seller_bond", "$SellerBond", "--funding_deadline", "$FundingDeadline", "--delivery_deadline", "$DeliveryDeadline", "--inspection_deadline", "$InspectionDeadline")
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "accept_terms", "--deal_id", $successDealId, "--participant", $SellerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "fund_buyer", "--deal_id", $successDealId, "--buyer", $BuyerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "fund_seller", "--deal_id", $successDealId, "--seller", $SellerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "submit_evidence", "--deal_id", $successDealId, "--seller", $SellerAlias, "--evidence_hash", $evidenceHash)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "accept_delivery", "--deal_id", $successDealId, "--buyer", $BuyerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--send", "no", "--", "get_deal", "--deal_id", $successDealId)
    exit 0
}

if ($Scenario -eq "ExpiryScenario") {
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "create_deal", "--deal_id", $expiryDealId, "--creator", $BuyerAlias, "--buyer", $BuyerAlias, "--seller", $SellerAlias, "--terms_hash", $termsHash, "--principal", "$Principal", "--buyer_bond", "$BuyerBond", "--seller_bond", "$SellerBond", "--funding_deadline", "$FundingDeadline", "--delivery_deadline", "$DeliveryDeadline", "--inspection_deadline", "$InspectionDeadline")
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "accept_terms", "--deal_id", $expiryDealId, "--participant", $SellerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "fund_buyer", "--deal_id", $expiryDealId, "--buyer", $BuyerAlias)
    if ($Execute) {
        $secondsToWait = [Math]::Max(0, ($FundingDeadline - (Unix-Now)) + 10)
        if ($secondsToWait -gt 0) {
            Write-Host "Waiting $secondsToWait seconds until funding deadline has passed before invoking expire_funding."
            Start-Sleep -Seconds $secondsToWait
        }
    } else {
        Write-Host "Wait until the funding deadline has passed before invoking expire_funding."
    }
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "expire_funding", "--deal_id", $expiryDealId)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--send", "no", "--", "get_deal", "--deal_id", $expiryDealId)
}
