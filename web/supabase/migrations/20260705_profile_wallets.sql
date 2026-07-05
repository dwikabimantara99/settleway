-- 20260705_profile_wallets.sql

CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    public_address TEXT NOT NULL,
    encrypted_secret_key TEXT NOT NULL,
    encryption_version TEXT NOT NULL DEFAULT 'aes-256-gcm-v1',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet address"
    ON public.user_wallets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Note: No INSERT/UPDATE policies for standard users. Provisioning is handled strictly via Service Role API.
