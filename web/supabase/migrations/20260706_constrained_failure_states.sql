DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'deal_status'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
    ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'DELIVERY_REJECTED';
    ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED';
  ELSE
    RAISE NOTICE 'public.deal_status enum does not exist; skipping enum value migration because status columns are text-compatible in TESTNET_PERSISTENT_DB.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'reputation_outcome'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.reputation_outcome ADD VALUE IF NOT EXISTS 'seller_breached_delivery';
  ELSE
    RAISE NOTICE 'public.reputation_outcome enum does not exist; skipping enum value migration because outcome columns are text-compatible in TESTNET_PERSISTENT_DB.';
  END IF;
END $$;
