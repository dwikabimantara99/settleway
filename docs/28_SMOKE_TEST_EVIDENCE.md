# 28 - Smoke Test Evidence

This document records the exact public evidence from the successful live Testnet smoke executions for the Settleway event-contract adapter.

## 1. Environment Details
- **Contract Wasm Hash**: `A73F99E3E1521E581B38488FF8F26F746843F2214282C3286D5334B7BCE04703`
- **Contract ID**: `CAGCSRJYCNYKC5BT2C7ZNHXHVMEHNJSJQPWZRFMFFRYCDSKHD6SREJKX`
- **Network**: Stellar Testnet
- **Network Passphrase**: `Test SDF Network ; September 2015`
- **Checkpoint Commit**: `b14381b63c7d2b8c6ea6494c74c4c01e61fd2d6b`

## 2. Public Signer Addresses
- **Admin**: `GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG`
- **Buyer Demo**: `GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX`
- **Seller Demo**: `GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU`

## 3. Scenario 1: Happy Path
**Command**: `happy_path`
**Execution Result**: `ok: true`
**Final Deal Status**: `COMPLETED`
**Final Escrow ID**: `3`

### Confirmed Actions
| Action | Signer Role | Transaction Hash | Status | Deal Status |
|--------|-------------|------------------|--------|-------------|
| `create_deal` | admin | `0d11d62ceba4ac3591898fc1e34cd750ac2eeb8841e9d367f09cc533d47ebd8a` | confirmed | `WAITING_DEPOSITS` |
| `buyer_deposit` | buyer_demo | `b7316b923beffc60a070f38f3b001a81d81caa3959e9e700768006f3140b6d49` | confirmed | `BUYER_FUNDED` |
| `seller_deposit` | seller_demo | `096ad577d57d5d7b67b93364b211865467043011ccde4328a2b3094ba4c7cb3a` | confirmed | `LOCKED` |
| `submit_proof` | seller_demo | `42913b8537cf0df26ddb517161eac6c24693c2ef316edf980103994e523f9fec` | confirmed | `PROOF_SUBMITTED` |
| `mark_delivered`| seller_demo | `ab2bb9321caf707c2b0e975d90c2e869c1d27617220e1a32c60f2f99d0ba9940` | confirmed | `DELIVERED` |
| `accept_delivery`| buyer_demo | `4495fdf719fae41a86664f43d7c61712131260d3a2d4a7826656e255d7e4f68a` | confirmed | `COMPLETED` |

## 4. Scenario 2: Expiry
**Command**: `expiry`
**Execution Result**: `ok: true`
**Final Deal Status**: `EXPIRED`
**Final Escrow ID**: `4`

### Confirmed Actions
| Action | Signer Role | Transaction Hash | Status | Deal Status |
|--------|-------------|------------------|--------|-------------|
| `create_deal` | admin | `b3afce3e0af982c2a5fe65b216eeabc1c885f288ffe9524e40d592bbfdb776b8` | confirmed | `WAITING_DEPOSITS` |
| `expire` | admin | `a7da6956769814bb44181aa5365731623f2da8f50203a479c616f30ecfaf06d0` | confirmed | `EXPIRED` |

## 5. Scenario 3: Refund
**Command**: `refund`
**Execution Result**: `ok: true`
**Final Deal Status**: `REFUNDED`
**Final Escrow ID**: `5`

### Confirmed Actions
| Action | Signer Role | Transaction Hash | Status | Deal Status |
|--------|-------------|------------------|--------|-------------|
| `create_deal` | admin | `11d06a7700835168c141e648f3214817c11944c04354bc757dd3010363b164eb` | confirmed | `WAITING_DEPOSITS` |
| `buyer_deposit` | buyer_demo | `c448ac679ec1f6dffb33ed574ee27ac825b12bee360b6ec89773bf7bf4d5cf59` | confirmed | `BUYER_FUNDED` |
| `refund` | admin | `72fb3f28b6a7a77e3e8fde3710efd4f57cb5f7ab73c20fec348591355c107f66` | confirmed | `REFUNDED` |

## 6. Safety Affirmation
All test outputs were inspected by the system for safe containment. No private seeds, keys, raw signature bytes, or signed XDR envelopes were logged or exposed.
