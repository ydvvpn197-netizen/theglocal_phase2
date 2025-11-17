-- Fix reports table missing columns
-- Version: 0130
-- Description: Add resolved_by and resolution_note columns for proper report resolution tracking
-- Date: 2025-11-14

SET search_path TO public;

-- Add missing columns to reports table
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- Add index for resolved_by for faster queries on resolved reports
CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON public.reports(resolved_by);

-- Add comment for documentation
COMMENT ON COLUMN public.reports.resolved_by IS 'User ID of the admin/moderator who resolved this report';
COMMENT ON COLUMN public.reports.resolution_note IS 'Optional note explaining the resolution decision';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Added resolved_by and resolution_note columns to reports table';
  RAISE NOTICE '✅ Added index on resolved_by column';
  RAISE NOTICE '📝 Migration 0130 complete - reports table columns fixed';
END$$;

