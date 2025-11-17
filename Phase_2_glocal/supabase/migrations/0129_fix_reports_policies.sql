-- Ensure reports RLS policies no longer reference legacy reporter_id column
-- Version: 0129
-- Date: 2025-11-12
-- Drops all existing policies on public.reports and recreates them using reported_by

SET search_path TO public;

-- Drop all existing policies so we don't miss renamed legacy policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports;', pol.policyname);
  END LOOP;
END
$$;

-- Recreate baseline policies with correct reported_by reference
CREATE POLICY "Users can view own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reported_by);

CREATE POLICY "Users can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Ensure moderators can review reports via service role
CREATE POLICY "Service role can manage reports"
  ON public.reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Provide visibility notice in migration logs
DO $$
BEGIN
  RAISE NOTICE '✅ Recreated reports RLS policies using reported_by column';
END
$$;


