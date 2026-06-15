param(
    [string]$WasmPath = "..\target\wasm32v1-none\release\settleway_escrow.wasm",
    [string]$AdminAlias = "settleway-testnet-admin",
    [string]$AdminPublicKey,
    [string]$ConfigDir = "$env:LOCALAPPDATA\Settleway\stellar-testnet-smoke"
)

$ErrorActionPreference = "Stop"

if (-not $AdminPublicKey) {
    Write-Error "AdminPublicKey must be provided to initialize the contract."
}

Write-Host "Deploying Wasm..."
$DeployOutput = & stellar --config-dir $ConfigDir contract deploy --wasm $WasmPath --source-account $AdminAlias --network testnet
$ContractId = $DeployOutput[-1].Trim()

Write-Host "Contract Deployed: $ContractId"
Write-Host "Initializing contract with admin $AdminPublicKey..."

& stellar --config-dir $ConfigDir contract invoke --id $ContractId --source-account $AdminAlias --network testnet -- initialize --admin $AdminPublicKey

Write-Host "Initialization complete."
