# Secret Rotation and Reputation Schema Recovery Checklist

## A. Secrets to rotate manually
- Supabase anon key / JWT-secret-dependent keys if applicable
- Supabase service role key
- Supabase database password
- wallet encryption key
- any Stellar secret key/seed if present in `.env.local`
- any other secret printed in logs

## B. Supabase rotation steps
- go to Supabase project settings
- rotate keys/passwords as appropriate
- update local `web/.env.local`
- never paste keys into chat or commit them
- rerun env presence checks with redacted output only

## C. Wallet encryption key warning
- existing encrypted wallet blobs may become unreadable unless migration/re-encryption is performed
- for demo/testnet environment, it may be acceptable to reset/recreate smoke profiles
- for production, never rotate without a migration plan

## D. Required reputation schema repair
The persistent proof is blocked until the remote Supabase schema supports the reputation evidence fields.
Required columns for `reputation_events` to review against code:
- proof_hash
- transaction_hash
- settlement_reference
- settled_at

## E. Proper migration policy
- add idempotent local migration
- apply only the targeted migration through approved operator path
- verify PostgREST can select the new columns
- rerun smoke only after verification
- DO NOT use `supabase db push` blindly
- DO NOT strip evidence columns from inserts
- DO NOT downgrade evidence quality to make tests pass
- DO NOT disable `server-only`

## F. Next proof criteria
The next proof may only be classified as `PERSISTENT_CUSTODY_LIFECYCLE_SUCCEEDED` if:
- all txs confirmed
- deal status COMPLETED
- deals.proof_hash non-null
- stellar_operations >= 6
- escrow_events >= 6
- reputation_events persisted for both parties or repo-consistent expected count
- reputation aggregates updated
- crowdfunding eligibility derived from live reputation
- no secret leakage
