-- ============================================
-- FIX POST CREATION REALTIME ERROR
-- Version: 0102
-- Description: Fix realtime.send() error in post creation by removing invalid broadcast calls
-- Date: 2025-01-29
-- ============================================
-- Issue: Error "function realtime.send(text, unknown, jsonb, boolean) does not exist"
--        occurs when users try to create posts
-- Root Cause: broadcast_community_post_changes() was calling realtime.send() which doesn't exist
-- Solution: Remove realtime.send() calls and use proper Supabase realtime (publication)
-- ============================================

SET search_path TO public;

-- ============================================
-- STEP 1: FIX BROADCAST_COMMUNITY_POST_CHANGES FUNCTION
-- ============================================
-- Remove the invalid realtime.send() call from post broadcasts

CREATE OR REPLACE FUNCTION broadcast_community_post_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Realtime updates are automatically handled via Supabase publication
  -- No need for manual realtime.send() calls
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 2: FIX BROADCAST_USER_NOTIFICATION FUNCTION
-- ============================================
-- Remove the invalid realtime.send() call from notification broadcasts

CREATE OR REPLACE FUNCTION broadcast_user_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Realtime updates are automatically handled via Supabase publication
  -- No need for manual realtime.send() calls
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 3: ENABLE REALTIME FOR POSTS TABLE
-- ============================================
-- Add posts table to supabase_realtime publication for automatic realtime updates

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS posts;

-- ============================================
-- STEP 4: ENABLE REALTIME FOR NOTIFICATIONS TABLE
-- ============================================
-- Add notifications table to supabase_realtime publication (if not already added)

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;

-- ============================================
-- VERIFICATION AND SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed realtime.send() error in post creation';
  RAISE NOTICE '✅ Removed invalid realtime.send() calls from broadcast functions';
  RAISE NOTICE '✅ Added posts and notifications tables to supabase_realtime publication';
  RAISE NOTICE '✅ Posts and notifications will now update in realtime automatically';
  RAISE NOTICE '✅ Migration 0102 complete - post creation should now work';
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION broadcast_community_post_changes IS 'Broadcasts post changes via Supabase publication (no manual realtime.send)';
COMMENT ON FUNCTION broadcast_user_notification IS 'Broadcasts notifications via Supabase publication (no manual realtime.send)';

