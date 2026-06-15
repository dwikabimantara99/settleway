# 30 - Controlled Testnet Smoke Evidence

This document records the exact transaction hashes verified via read-only queries against the public Stellar Testnet Horizon API.

## Happy Path Transactions (Escrow ID: 3)
All of the following transactions were verified as successfully executed on-chain. Due to the lack of read-only escrow state queries, the local deal state of `COMPLETED` is partially inferred from the successful completion of the `accept_delivery` operation.
- **`create_deal`** (Admin)
  - Hash: `0d11d62ceba4ac3591898fc1e34cd750ac2eeb8841e9d367f09cc533d47ebd8a`
  - Status: Confirmed (Ledger 3100194)
- **`buyer_deposit`** (Buyer Demo)
  - Hash: `b7316b923beffc60a070f38f3b001a81d81caa3959e9e700768006f3140b6d49`
  - Status: Confirmed (Ledger 3100195)
- **`seller_deposit`** (Seller Demo)
  - Hash: `096ad577d57d5d7b67b93364b211865467043011ccde4328a2b3094ba4c7cb3a`
  - Status: Confirmed (Ledger 3100197)
- **`submit_proof`** (Seller Demo)
  - Hash: `42913b8537cf0df26ddb517161eac6c24693c2ef316edf980103994e523f9fec`
  - Status: Confirmed (Ledger 3100198)
- **`mark_delivered`** (Seller Demo)
  - Hash: `ab2bb9321caf707c2b0e975d90c2e869c1d27617220e1a32c60f2f99d0ba9940`
  - Status: Confirmed (Ledger 3100199)
- **`accept_delivery`** (Buyer Demo)
  - Hash: `4495fdf719fae41a86664f43d7c61712131260d3a2d4a7826656e255d7e4f68a`
  - Status: Confirmed (Ledger 3100200)

## Expiry Path Transactions (Escrow ID: 4)
The expiry transactions were verified successfully on-chain.
- **`create_deal`** (Admin)
  - Hash: `b3afce3e0af982c2a5fe65b216eeabc1c885f288ffe9524e40d592bbfdb776b8`
  - Status: Confirmed (Ledger 3100206)
- **`expire`** (Admin)
  - Hash: `a7da6956769814bb44181aa5365731623f2da8f50203a479c616f30ecfaf06d0`
  - Status: Confirmed (Ledger 3100208)

## Refund Path Transactions (Escrow ID: 5)
The refund transactions were verified successfully on-chain.
- **`create_deal`** (Admin)
  - Hash: `11d06a7700835168c141e648f3214817c11944c04354bc757dd3010363b164eb`
  - Status: Confirmed (Ledger 3100211)
- **`buyer_deposit`** (Buyer Demo)
  - Hash: `c448ac679ec1f6dffb33ed574ee27ac825b12bee360b6ec89773bf7bf4d5cf59`
  - Status: Confirmed (Ledger 3100213)
- **`refund`** (Admin)
  - Hash: `72fb3f28b6a7a77e3e8fde3710efd4f57cb5f7ab73c20fec348591355c107f66`
  - Status: Confirmed (Ledger 3100214)

## Duplicate or Abandoned Attempts
The start of Escrow ID at `3` in the available documentation implies that earlier executions creating Escrows `0`, `1`, and `2` are inferred to have been abandoned due to timeouts but still executed silently on-chain as duplicate actions. Their exact hashes were lost to the local adapter state.

## Unknown or Incomplete Operations
No unknown or incomplete operations were recorded in the available log artifacts. Every hash in the inventory returned a definitive `SUCCESS` status via Horizon API.
