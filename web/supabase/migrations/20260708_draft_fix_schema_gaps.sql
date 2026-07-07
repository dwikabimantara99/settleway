-- DRAFT MIGRATION: DO NOT APPLY REMOTELY
-- Fix user_wallets schema gap for non-UUID profile IDs
ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_user_id_fkey;
ALTER TABLE public.user_wallets ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.user_wallets ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix escrow_events schema gap for non-UUID event IDs
ALTER TABLE public.escrow_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.escrow_events ALTER COLUMN id TYPE TEXT USING id::text;
