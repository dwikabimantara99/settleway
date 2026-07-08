-- Migration: Hybrid Identity / Profile-first Schema Alignment
-- Purpose: Align Supabase persistence layer with Settleway TEXT profile IDs and custom event IDs.

-- 1. Add optional Supabase Auth linking to profiles (preserves auth.users integration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Align user_wallets to reference Settleway profile IDs rather than forced Auth UUIDs
ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_user_id_fkey;
ALTER TABLE public.user_wallets ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.user_wallets ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Align escrow_events to use custom TEXT IDs and reference profiles
ALTER TABLE public.escrow_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.escrow_events ALTER COLUMN id TYPE TEXT USING id::text;
-- Add foreign key constraint for actor_id to profiles, if not already constrained
DO $ $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'escrow_events_actor_id_fkey'
    ) THEN
        ALTER TABLE public.escrow_events ADD CONSTRAINT escrow_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END
$ $;
