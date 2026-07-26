-- Migration 017: Create competitions and competition_entries tables for the Playground arena

CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  sponsor_name text NOT NULL DEFAULT 'BugBountyAI',
  sponsor_logo text,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Smart Contracts',
  repo_url text NOT NULL,
  branch text NOT NULL DEFAULT 'main',
  prize_pool_usdc numeric(18,2) NOT NULL DEFAULT 1000.00,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'upcoming' | 'completed'
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  escrow_contract_address text,
  escrow_tx_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  audit_id uuid REFERENCES public.audits(id) ON DELETE SET NULL,
  score integer NOT NULL DEFAULT 0,
  rank integer,
  findings_count integer NOT NULL DEFAULT 0,
  reward_earned numeric(18,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitions_status ON public.competitions (status);
CREATE INDEX IF NOT EXISTS idx_competitions_end_date ON public.competitions (end_date);
CREATE INDEX IF NOT EXISTS idx_competition_entries_competition ON public.competition_entries (competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_score ON public.competition_entries (score DESC);
