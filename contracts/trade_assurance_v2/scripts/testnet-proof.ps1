param(
    [ValidateSet(
        "Plan",
        "DeployInitialize",
        "SuccessScenario",
        "ExpiryScenario",
        "SellerBreachScenario",
        "BuyerBreachScenario",
        "MutualCancellationScenario",
        "DisputeScenario"
    )]
    [string] $Scenario = "Plan",
    [switch] $Execute,
    [string] $Network = "testnet",
    [string] $ConfigDir = "",
    [string] $SourceAlias = "",
    [string] $BuyerAlias = "",
    [string] $SellerAlias = "",
    [string] $MediatorAlias = "",
    [string] $TreasuryAddress = "",
    [string] $AcceptedAssetContractId = "",
    [string] $ContractId = "",
    [string] $ContractAlias = "settleway-trade-assurance-v2-1",
    [string] $WasmPath = "target\wasm32v1-none\release\trade_assurance_v2.wasm",
    [int64] $PolicyVersion = 2,
    [int64] $SuccessFeeBps = 0,
    [int64] $SellerBreachTreasuryBps = 2000,
    [int64] $BuyerBreachTreasuryBps = 2000,
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

function Invoke-ExpectFailure {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]] $CommandArgs)
    $globalArgs = @()
    if (-not [string]::IsNullOrWhiteSpace($ConfigDir)) {
        $globalArgs = @("--config-dir", $ConfigDir)
    }
    $allArgs = $globalArgs + $CommandArgs
    $display = "stellar " + ($allArgs -join " ")
    if (-not $Execute) {
        Write-Host "[dry-run expected-failure] $display"
        return
    }
    Write-Host "[execute expected-failure] $display"
    & stellar @allArgs
    if ($LASTEXITCODE -eq 0) {
        throw "Expected Stellar CLI command to fail, but it succeeded."
    }
    Write-Host "[expected-failure observed] exit code $LASTEXITCODE"
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

function Wait-Until {
    param([int64] $Deadline, [string] $Label)
    if ($Execute) {
        $secondsToWait = [Math]::Max(0, ($Deadline - (Unix-Now)) + 8)
        if ($secondsToWait -gt 0) {
            Write-Host "Waiting $secondsToWait seconds for $Label deadline."
            Start-Sleep -Seconds $secondsToWait
        }
    } else {
        Write-Host "Wait until now >= $Deadline before invoking the timeout for $Label."
    }
}

foreach ($pair in @(
    @("SourceAlias", $SourceAlias),
    @("BuyerAlias", $BuyerAlias),
    @("SellerAlias", $SellerAlias),
    @("MediatorAlias", $MediatorAlias),
    @("TreasuryAddress", $TreasuryAddress),
    @("AcceptedAssetContractId", $AcceptedAssetContractId),
    @("ContractId", $ContractId)
)) {
    Assert-NoSecretLikeValue -Name $pair[0] -Value $pair[1]
}

if ($FundingDeadline -eq 0) {
    $FundingDeadline = [DateTimeOffset]::UtcNow.AddMinutes(2).ToUnixTimeSeconds()
}
if ($DeliveryDeadline -eq 0) {
    $DeliveryDeadline = [DateTimeOffset]::UtcNow.AddMinutes(4).ToUnixTimeSeconds()
}
if ($InspectionDeadline -eq 0) {
    $InspectionDeadline = [DateTimeOffset]::UtcNow.AddMinutes(6).ToUnixTimeSeconds()
}

$termsHash = Deal-Id "settleway-v2-1-terms-proof"
$evidenceHash = Deal-Id "settleway-v2-1-evidence-proof"
$disputeReasonHash = Deal-Id "settleway-v2-1-dispute-reason"
$scenarioPrefix = "settleway-v2-1-$Scenario-$(Unix-Now)"

Write-Host "Scenario: $Scenario"
Write-Host "Mode: $(if ($Execute) { "execute" } else { "dry-run" })"
Write-Host "Network: $Network"
Write-Host "This script never accepts or prints Stellar secret keys."

if ($Scenario -eq "Plan") {
    Write-Host ""
    Write-Host "1. Build Wasm: cargo build --workspace --target wasm32v1-none --release"
    Write-Host "2. Select asset contract id, for native XLM SAC: stellar contract id asset --asset native --network $Network"
    Write-Host "3. Deploy and initialize with -Scenario DeployInitialize."
    Write-Host "4. Run SuccessScenario, ExpiryScenario, SellerBreachScenario, BuyerBreachScenario, MutualCancellationScenario, and DisputeScenario."
    Write-Host "5. Every scenario prints deterministic deal ids and Stellar CLI commands."
    exit 0
}

if ($Scenario -eq "DeployInitialize") {
    Assert-Required "SourceAlias" $SourceAlias
    Assert-Required "TreasuryAddress" $TreasuryAddress
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
        "--treasury", $TreasuryAddress,
        "--policy_version", "$PolicyVersion",
        "--success_fee_bps", "$SuccessFeeBps",
        "--seller_breach_treasury_bps", "$SellerBreachTreasuryBps",
        "--buyer_breach_treasury_bps", "$BuyerBreachTreasuryBps"
    )
    exit 0
}

Assert-Required "ContractId" $ContractId
Assert-Required "BuyerAlias" $BuyerAlias
Assert-Required "SellerAlias" $SellerAlias
Assert-Required "MediatorAlias" $MediatorAlias

function Create-And-Accept {
    param([string] $DealId)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "create_deal", "--deal_id", $DealId, "--creator", $BuyerAlias, "--buyer", $BuyerAlias, "--seller", $SellerAlias, "--mediator", $MediatorAlias, "--terms_hash", $termsHash, "--principal", "$Principal", "--buyer_bond", "$BuyerBond", "--seller_bond", "$SellerBond", "--funding_deadline", "$FundingDeadline", "--delivery_deadline", "$DeliveryDeadline", "--inspection_deadline", "$InspectionDeadline")
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "accept_terms", "--deal_id", $DealId, "--participant", $SellerAlias)
}

function Fund-Both {
    param([string] $DealId)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "fund_buyer", "--deal_id", $DealId, "--buyer", $BuyerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "fund_seller", "--deal_id", $DealId, "--seller", $SellerAlias)
}

function Read-Deal {
    param([string] $DealId, [string] $Source = $BuyerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $Source, "--network", $Network, "--send", "no", "--", "get_deal", "--deal_id", $DealId)
}

if ($Scenario -eq "SuccessScenario") {
    $dealId = Deal-Id "$scenarioPrefix-success"
    Create-And-Accept -DealId $dealId
    Fund-Both -DealId $dealId
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "submit_evidence", "--deal_id", $dealId, "--seller", $SellerAlias, "--evidence_hash", $evidenceHash)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "accept_delivery", "--deal_id", $dealId, "--buyer", $BuyerAlias)
    Read-Deal -DealId $dealId
    exit 0
}

if ($Scenario -eq "ExpiryScenario") {
    $dealId = Deal-Id "$scenarioPrefix-expiry"
    Create-And-Accept -DealId $dealId
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "fund_buyer", "--deal_id", $dealId, "--buyer", $BuyerAlias)
    Wait-Until -Deadline $FundingDeadline -Label "funding"
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "expire_funding", "--deal_id", $dealId)
    Read-Deal -DealId $dealId
    exit 0
}

if ($Scenario -eq "SellerBreachScenario") {
    $dealId = Deal-Id "$scenarioPrefix-seller-breach"
    Create-And-Accept -DealId $dealId
    Fund-Both -DealId $dealId
    Wait-Until -Deadline $DeliveryDeadline -Label "delivery"
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "expire_delivery", "--deal_id", $dealId)
    Read-Deal -DealId $dealId
    exit 0
}

if ($Scenario -eq "BuyerBreachScenario") {
    $dealId = Deal-Id "$scenarioPrefix-buyer-breach"
    Create-And-Accept -DealId $dealId
    Fund-Both -DealId $dealId
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "submit_evidence", "--deal_id", $dealId, "--seller", $SellerAlias, "--evidence_hash", $evidenceHash)
    Wait-Until -Deadline $InspectionDeadline -Label "inspection"
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "expire_inspection", "--deal_id", $dealId)
    Read-Deal -DealId $dealId
    exit 0
}

if ($Scenario -eq "MutualCancellationScenario") {
    $dealId = Deal-Id "$scenarioPrefix-mutual-cancel"
    Create-And-Accept -DealId $dealId
    Fund-Both -DealId $dealId
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "approve_mutual_cancellation", "--deal_id", $dealId, "--participant", $BuyerAlias)
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "approve_mutual_cancellation", "--deal_id", $dealId, "--participant", $SellerAlias)
    Read-Deal -DealId $dealId
    exit 0
}

if ($Scenario -eq "DisputeScenario") {
    $dealId = Deal-Id "$scenarioPrefix-dispute"
    Create-And-Accept -DealId $dealId
    Fund-Both -DealId $dealId
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $BuyerAlias, "--network", $Network, "--", "raise_dispute", "--deal_id", $dealId, "--participant", $BuyerAlias, "--reason_hash", $disputeReasonHash)
    Invoke-ExpectFailure -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $SellerAlias, "--network", $Network, "--", "resolve_dispute", "--deal_id", $dealId, "--mediator", $SellerAlias, "--outcome", "2")
    Invoke-Or-Print -CommandArgs @("contract", "invoke", "--id", $ContractId, "--source-account", $MediatorAlias, "--network", $Network, "--", "resolve_dispute", "--deal_id", $dealId, "--mediator", $MediatorAlias, "--outcome", "2")
    Read-Deal -DealId $dealId
}
