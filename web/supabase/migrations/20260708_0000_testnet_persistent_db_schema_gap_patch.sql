-- Migration: TESTNET_PERSISTENT_DB Schema Gap Patch
-- Purpose: Address observed missing tables and columns on the Testnet persistent DB safely.

-- 1. Safely add auth_user_id to profiles if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN auth_user_id UUID;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auth_user_id_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auth_user_id_fkey'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- 2. Create user_wallets if missing, targeting TEXT profiles.id
CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    public_address TEXT NOT NULL,
    encrypted_secret_key TEXT NOT NULL,
    encryption_version TEXT NOT NULL DEFAULT 'aes-256-gcm-v1',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for user_wallets
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
-- No standard user policies; access is via Service Role API.

-- 3. Safely cast escrow_events.id to TEXT if it is UUID
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'escrow_events' 
      AND column_name = 'id';
      
    IF col_type = 'uuid' THEN
        ALTER TABLE public.escrow_events ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.escrow_events ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;
END
$$;

-- 4. Safely constrain escrow_events.actor_id to profiles
-- This blocks if there are orphan actor_ids.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'escrow_events_actor_id_fkey'
    ) THEN
        -- Check for orphans first to prevent crashing halfway
        IF EXISTS (
            SELECT 1 FROM public.escrow_events e 
            LEFT JOIN public.profiles p ON e.actor_id = p.id 
            WHERE p.id IS NULL AND e.actor_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Orphan escrow_events.actor_id found. Cannot create foreign key constraint.';
        ELSE
            ALTER TABLE public.escrow_events ADD CONSTRAINT escrow_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
        END IF;
    END IF;
END
$$;
