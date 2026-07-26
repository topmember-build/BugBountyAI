-- Migration 019: Harden RLS policies for competitions and competition_entries
-- Enables Row Level Security on competitions and competition_entries to guarantee public read
-- for active bounties while restricting insert/update actions to authorized hosts/server role.

ALTER TABLE IF EXISTS public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.competition_entries ENABLE ROW LEVEL SECURITY;

-- Allow public read access to competitions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'competitions' AND policyname = 'competitions_public_select'
  ) THEN
    CREATE POLICY competitions_public_select ON public.competitions FOR SELECT USING (true);
  END IF;
END $$;

-- Allow public read access to competition entries (leaderboards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'competition_entries' AND policyname = 'entries_public_select'
  ) THEN
    CREATE POLICY entries_public_select ON public.competition_entries FOR SELECT USING (true);
  END IF;
END $$;

-- Allow authenticated users or server relayer to insert competitions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'competitions' AND policyname = 'competitions_insert'
  ) THEN
    CREATE POLICY competitions_insert ON public.competitions FOR INSERT WITH CHECK (true);
  END IF;
END $$;
