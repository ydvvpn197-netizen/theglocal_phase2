-- Fix reports RLS policies referencing deprecated reporter_id column
-- Version: 0128
-- Date: 2025-11-12
-- Ensures RLS policies use the correct reported_by column

SET search_path TO public;

-- Drop legacy policies that might reference reporter_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = 'Users can view own reports'
  ) THEN
    DROP POLICY "Users can view own reports" ON public.reports;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = 'Users can create reports'
  ) THEN
    DROP POLICY "Users can create reports" ON public.reports;
  END IF;
END
$$;

-- Recreate policies with the correct reported_by column
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reported_by);

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Verification notices
DO $$
BEGIN
  RAISE NOTICE '✅ Updated reports RLS policies to use reported_by';
END
$$;

