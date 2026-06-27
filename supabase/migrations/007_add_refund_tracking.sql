-- Add refund tracking columns to audit_fees

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS refund_external_id varchar;

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- No automatic backfill: refunded_at is null for historical rows
