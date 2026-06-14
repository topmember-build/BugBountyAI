-- Create audit_fees table to record fee authorization attempts for audits

CREATE TABLE IF NOT EXISTS public.audit_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  transaction_id text,
  challenge_id text,
  idempotency_key text UNIQUE,
  amount numeric(18,8) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_fees_user_id ON public.audit_fees (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_fees_transaction_id ON public.audit_fees (transaction_id);
