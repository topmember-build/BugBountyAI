-- Add escrow fee breakdown columns to audit_fees

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS escrow_fee numeric(18,8) DEFAULT 0;

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS net_amount numeric(18,8);

-- Backfill net_amount for existing rows where not set
UPDATE public.audit_fees
SET net_amount = amount - COALESCE(escrow_fee, 0)
WHERE net_amount IS NULL;
