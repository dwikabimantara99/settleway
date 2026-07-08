# Hybrid Identity / Profile-First Schema

**Classification:** HYBRID_IDENTITY_SCHEMA_ALIGNMENT_READY

## The Model
Settleway uses a **Hybrid Identity** approach that strictly decouples the *login* identity from the *product/domain* identity.

- **Supabase Auth UUID (uth.users.id)**: Serves strictly as the authentication/login identity.
- **Settleway Profile ID (profiles.id)**: Serves as the canonical product/domain identity. This is a custom TEXT identifier (e.g. uyer-probolinggo-cabai or profile-12345).

## Why Supabase Auth UUID is Login Identity Only
By treating uth.users solely as a credential layer, Settleway can support multiple authentication strategies (Email/Password, OAuth, SMS) or even anonymous/demo sessions without permanently tying domain records to a specific auth row. It also cleanly segregates the secure credential space from public domain knowledge.

## Why Settleway Profile ID is Domain/Product Identity
In B2B agricultural trade-assurance, the "Profile" is the entity holding reputation, executing deals, placing funds in escrow, and delivering commodities. A profile may be a corporate entity managed by multiple team members (future multi-user accounts). The profile itself must be the root of trust for all domain operations.

## Schema Linkage
All domain entities structurally link to profiles.id (TEXT), not uth.users.id (UUID):
- user_wallets.user_id -> profiles.id
- deals.buyer_id / deals.seller_id -> profiles.id
- escrow_events.actor_id -> profiles.id
- eputation_events.user_id (future) -> profiles.id

Integration back to Supabase Auth is strictly optional, maintained through profiles.auth_user_id (UUID NULL UNIQUE). This allows purely simulated demo actors (who have no auth credential) to coexist seamlessly with production authenticated users on the same database schema.

## What remains before public Testnet deployment?
1. The Settleway product stakeholders must review and approve this Hybrid Identity model.
2. The schema migration 20260708_hybrid_identity_schema_alignment.sql must be securely executed against the persistent Supabase instance (staging/production).
3. We need to implement and test the UI/Auth flow that links a newly registered uth.users.id to a generated profiles.id.

## Note on Executions
**Explicit Note:** This document and its accompanying migration file (20260708_hybrid_identity_schema_alignment.sql) were drafted locally. **No remote migration was applied in this branch. No deployments were run.**
