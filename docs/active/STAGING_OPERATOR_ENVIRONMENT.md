# Staging Operator Environment

## 1. Purpose
This document provides guidelines for securely provisioning the operator environment required to execute the Controlled Staging Migration for Settleway.

## 2. Required tools
The executing operator machine MUST have:
- \git\
- \
ode\ and \
pm\
- \supabase\ CLI (installed natively via package manager or run via \
px supabase\)

**Note: The presence of \
px\ alone is not enough; \
px supabase --version\ must successfully execute.**

## 3. Required environment variables
The following variables MUST be present in the operator's shell environment or a secure secret manager.
- \STAGING_DATABASE_URL\
- \SUPABASE_SERVICE_ROLE_KEY\
- \WALLET_ENCRYPTION_KEY\
- \NEXT_PUBLIC_RUNTIME_MODE\ (must be strictly \persistent\)
- \RUNTIME_MODE\ (must be strictly \persistent\)
- \NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE\ (must indicate Testnet)
- \NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID\
- \CUSTODY_V2_STELLAR_RPC_URL\

## 4. How to verify presence safely
Run the provided safe preflight script:
\\\ash
pwsh scripts/staging/preflight-env.ps1
\\\
This script explicitly checks for the tools and variable presence, and validates their internal constraints without printing sensitive values to standard output.

**Do not run the migration until this preflight exits 0 (STATUS: READY).**

## 5. How to avoid leaking secrets
- **Do not paste secrets into chat or shell history.**
- **Do not screenshot secrets or console logs containing them.**
- **Do not commit \.env.local\ files or hardcode credentials in codebase.**
- Use a secure Vault, 1Password, or native OS keychain to inject secrets into the active terminal session.

## 6. What not to do
- Do not use the production Supabase project. Use Staging only.
- Do not use Stellar Mainnet. Use Stellar Testnet only.
- Do not blindly ignore preflight warnings.

## 7. When to retry Controlled Staging Migration Execution
**Important: This documentation branch only provides preflight docs/scripts. It does not mean the current operator environment is ready.**

The operator environment is officially ready only when \scripts/staging/preflight-env.ps1\ exits 0. Once the script reports **STATUS: READY**, the operator is cleared to formally retry the Controlled Staging Migration Execution following the steps in \docs/active/STAGING_MIGRATION_RUNBOOK.md\.
