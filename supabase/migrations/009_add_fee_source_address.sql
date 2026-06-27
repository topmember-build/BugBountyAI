-- Store the wallet address that paid the audit fee
-- Refunds will be issued back to this address

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS source_address varchar;

CREATE INDEX IF NOT EXISTS idx_audit_fees_source_address ON public.audit_fees (source_address);
