# Persistent Custody Lifecycle Proof

## Execution Summary
- **Timestamp**: 2026-07-10T06:42:46.261Z
- **Git SHA**: 885224d
- **Classification**: PERSISTENT_CUSTODY_LIFECYCLE_BLOCKED_REPUTATION

## State Overview
- **Deployed Custody Contract ID**: CDI2YXSICZLNX7M3FBLEFBTQHXAV76YO5PVLFQ6LQLBCA5Q3KKUY5QXN
- **Token Contract ID**: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
- **Public Buyer Wallet**: GAL3NAJBMOXZOOXGC7XKHJFD3ORKVBMEGDNY7BZWMWSV65V3EBC52PYU
- **Public Seller Wallet**: GD2NXE4WUX4JG4UEKN3M4TV4GF6EQ5FHWM2INGBZM6MB5DW7CSBUBIYE
- **Deal ID**: custody_deal_1783665695844
- **Contract Escrow ID**: 1
- **Final DB Deal Status**: COMPLETED

## Transaction Hashes
- **Create Custody**: 46cea5bd4d53351ee0da4b16148de2bc40e915a46fa742d7273ed866157111a9
- **Buyer Deposit**: 58180823c9b8c9f476220aa891efaed1dcd33b5826fa73e674d506b239dee93d
- **Seller Deposit**: 8691ea87501ec4a695a06013421aa8ce15c7ad00ee4976a9d827a271308cb0a2
- **Submit Proof**: 2fdf7ac3af4c07c95f0cf34b5b51654fc4c1ef5cda122b04d2aa7f0f685445f8
- **Mark Delivered**: e1ab7e4158f4754bc0d1059dd39b62a46eef3d3e55e186669346fc4aaf682e1b
- **Settlement**: 279db06fbf23b8b98cdc86aef54c4ecb4993c7464e3b64beb594f9812eae40f3

## Database Verification Evidence
- **stellar_operations count**: 6
- **escrow_events count**: 6
- **reputation event count**: 0
- **Final reputation values**: NONE (Not updated due to PGRST204)
- **Crowdfunding eligibility result**: N/A (Reputation failed)

## Error Investigation
- **Full error list**:
  - `Hook error: PGRST204 (Could not find the 'proof_hash' column of 'reputation_events' in the schema cache)`
- **Clear statement of what remains unproven**:
  The persistence of `proof_hash` on the `deals` table is missing (the UI reducer does not map it into the local DB state properly), and the `reputation_events` table failed to insert because it is missing the `proof_hash` column on the remote Supabase schema. Thus, proof persistence, reputation engine execution, and crowdfunding eligibility outcomes remain unproven.
