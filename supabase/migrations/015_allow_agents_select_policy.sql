-- Allow public reads of registered agents while keeping writes scoped to owners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agents'
      AND policyname = 'agents_select_public'
  ) THEN
    CREATE POLICY agents_select_public
    ON public.agents
    FOR SELECT
    TO authenticated, anon
    USING (true);
  END IF;
END
$$;
