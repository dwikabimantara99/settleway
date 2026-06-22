# Security Policy

## Reporting

Please report security concerns privately to the repository owner instead of opening a public issue with exploit details or sensitive material.

## Secret Handling

Do not commit `.env` files, private keys, seed phrases, service-role keys, signed XDR, or managed-account credentials. Committed environment files must contain placeholders only.

## Dependency Risk

Production dependency vulnerabilities are reviewed with `npm audit --omit=dev`. High and critical production findings block promotion unless there is no compatible fix and the accepted risk is documented in the active promotion report.

Dependabot is configured for weekly npm and GitHub Actions review so patch and minor updates can be evaluated without daily churn.

## Demo And Testnet Boundary

Settleway currently contains hackathon/demo and Stellar Testnet proof infrastructure. It must not be represented as production financial custody, real bank transfer, QRIS, KYC/KYB, or trustless token escrow unless those capabilities are separately implemented, validated, and documented.
