-- Create wallet nonces and user_wallets

CREATE TABLE IF NOT EXISTS public.wallet_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  message text NOT NULL,
  nonce text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_nonces_address ON public.wallet_nonces (address);

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, address)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets (user_id);
