-- Add audit queue metadata fields for asynchronous processing

ALTER TABLE IF EXISTS public.audits
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE IF EXISTS public.audits
  ADD COLUMN IF NOT EXISTS audit_fee_id uuid;

ALTER TABLE IF EXISTS public.audits
  ADD COLUMN IF NOT EXISTS selected_agent_ids text[];

ALTER TABLE IF EXISTS public.audits
  ADD COLUMN IF NOT EXISTS selected_agent_types text[];

CREATE INDEX IF NOT EXISTS idx_audits_audit_fee_id ON public.audits (audit_fee_id);
