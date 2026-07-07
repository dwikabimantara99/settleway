# Supabase Persistence Schema Gaps

**Classification:** SUPABASE_PERSISTENCE_SCHEMA_GAP_FOUND

**Explicit Warning:** DO NOT APPLY WITHOUT REVIEW.
**Explicit Note:** This document is non-executable documentation and was not applied remotely.

## Gap 1: user_wallets.user_id UUID vs app TEXT profile IDs
- user_wallets.user_id is defined as UUID referencing uth.users(id).
- Current Settleway MVP uses custom TEXT profile IDs (e.g., uyer-probolinggo-cabai).
- These TEXT IDs violate the Postgres UUID constraint and uth.users foreign key constraint.

## Gap 2: escrow_events.id UUID vs app TEXT event IDs
- escrow_events.id is defined as UUID.
- The application generates custom TEXT event IDs (e.g., event-12345-abcde).
- Inserting these events into Supabase throws a type casting exception.

## Draft SQL Migration
\\\sql
-- DRAFT MIGRATION: DO NOT APPLY REMOTELY
-- Fix user_wallets schema gap for non-UUID profile IDs
ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_user_id_fkey;
ALTER TABLE public.user_wallets ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.user_wallets ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix escrow_events schema gap for non-UUID event IDs
ALTER TABLE public.escrow_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.escrow_events ALTER COLUMN id TYPE TEXT USING id::text;
\\\

## Risk Notes
- Casting UUID to TEXT is safe data-wise, but using demo names (non-UUIDs) would fail the uuid constraints in Postgres before the change. After this change, it's safe. There is no real data loss risk on user_wallets.user_id if there is no production data.

## Open Decision
- **Option A:** Adopt TEXT IDs in the persistence schema by formally applying the draft SQL.
- **Option B:** Refactor the application layer to strictly emit authenticated v4 UUIDs for all identifiers.
