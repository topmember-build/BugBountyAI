-- Enable row-level security and allow authenticated users to manage their own agents.

ALTER TABLE IF EXISTS public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY agents_insert_for_owner
ON public.agents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY agents_update_owner
ON public.agents
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid()::text)
WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY agents_delete_owner
ON public.agents
FOR DELETE
TO authenticated
USING (owner_id = auth.uid()::text);
