-- Fix Post Deletion RLS Policy
-- Version: 0044
-- Description: Allow authors to view/edit/delete their own posts regardless of community membership
-- Date: 2025-10-15

SET search_path TO public;

-- ============================================
-- FIX POSTS SELECT POLICY
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view accessible posts" ON posts;

-- Recreate with author exception
-- SELECT: Users can view posts in accessible communities OR their own posts
CREATE POLICY "Users can view accessible posts"
  ON posts FOR SELECT
  USING (
    -- Users can view non-deleted posts in communities they have access to
    (NOT is_deleted AND can_view_community_safe(community_id, auth.uid()))
    OR
    -- Authors can always view their own posts (even if deleted or left community)
    auth.uid() = author_id
  );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed posts SELECT policy to allow authors to view own posts';
  RAISE NOTICE '✅ Users can now delete their posts after leaving a community';
  RAISE NOTICE '✅ Users can now edit their posts after leaving a community';
  RAISE NOTICE '📝 Migration 0044 complete';
END$$;

COMMENT ON POLICY "Users can view accessible posts" ON posts IS 
  'Allows viewing non-deleted posts in accessible communities, plus allows authors to always view their own posts regardless of community membership status';

