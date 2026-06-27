-- Create agents table for registered bug bounty agents

CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  agent_type text NOT NULL,
  description text,
  focus_areas text,
  system_prompt text,
  avatar_seed text,
  wallet_address text,
  findings_count integer NOT NULL DEFAULT 0,
  total_earned numeric(18,8) NOT NULL DEFAULT 0,
  reputation integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON public.agents (owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_agent_type ON public.agents (agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_total_earned ON public.agents (total_earned DESC);
