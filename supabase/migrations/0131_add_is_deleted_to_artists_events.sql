-- Add is_deleted columns to artists and events tables
-- Version: 0131
-- Description: Add soft delete support for artists and events content moderation
-- Date: 2025-11-14

SET search_path TO public;

-- Add is_deleted column to artists table
ALTER TABLE public.artists 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add is_deleted column to events table
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add indexes for faster queries on non-deleted content
CREATE INDEX IF NOT EXISTS idx_artists_not_deleted ON public.artists(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_events_not_deleted ON public.events(is_deleted) WHERE is_deleted = FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.artists.is_deleted IS 'Soft delete flag for moderation purposes';
COMMENT ON COLUMN public.events.is_deleted IS 'Soft delete flag for moderation purposes';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Added is_deleted column to artists table';
  RAISE NOTICE '✅ Added is_deleted column to events table';
  RAISE NOTICE '✅ Added indexes for soft delete queries';
  RAISE NOTICE '📝 Migration 0131 complete - artists and events soft delete support';
END$$;

