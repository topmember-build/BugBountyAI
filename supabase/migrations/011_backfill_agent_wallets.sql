-- Backfill agents.wallet_address from the user's linked wallets when missing.

UPDATE public.agents a
SET wallet_address = u.address
FROM public.user_wallets u
WHERE a.owner_id = u.user_id
  AND (a.wallet_address IS NULL OR a.wallet_address = '')
  AND u.address IS NOT NULL;
