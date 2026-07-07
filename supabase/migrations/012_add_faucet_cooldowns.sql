CREATE TABLE IF NOT EXISTS public.faucet_cooldowns (
  user_id text PRIMARY KEY,
  last_claimed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faucet_cooldowns_last_claimed_at ON public.faucet_cooldowns (last_claimed_at);
