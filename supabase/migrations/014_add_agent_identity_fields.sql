-- 2026-07-18 - add on-chain agent identity fields
alter table public.agents
  add column if not exists onchain_agent_id text,
  add column if not exists onchain_registry_address text,
  add column if not exists onchain_identity_status text;
