-- Add refund tx hash column to audit_fees

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS refund_tx_hash varchar;

-- No backfill; will be populated by reconcile job when tx settles
