-- 2026-06-26 - create agent_contracts table
create table if not exists agent_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  contract_address text not null,
  name text,
  metadata jsonb,
  created_at timestamptz default now()
);

create unique index if not exists idx_agent_contracts_address on agent_contracts(lower(contract_address));
