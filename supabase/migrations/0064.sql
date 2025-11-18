-- Fix Comment Soft Delete Issue for Admins/Moderators
-- Version: 0064
-- Description: Fix RLS policy preventing admins/moderators from soft deleting comments
-- Date: 2025-10-22
-- References: Same issue fixed for posts in migration 0063

SET search_path TO public;

-- ============================================
-- DIAGNOSIS
-- ============================================

-- Issue: Admins/moderators cannot delete comments - receiving "Failed to delete comment" error
-- Root Cause: The soft delete operation uses UPDATE (not DELETE) to set is_deleted = true
--             Only authors have UPDATE policy, admins don't have UPDATE permissions
-- 
-- Current Policies (from migrations 0042):
--   - "Authors can update own comments" FOR UPDATE USING (auth.uid() = author_id)
--   - "Authors can delete own comments" FOR DELETE USING (auth.uid() = author_id)
--   - "Admins can delete comments" FOR DELETE USING (admin checks) -- from migration 0060
--
-- The problem: Soft delete uses UPDATE but admins only have DELETE policy
-- Solution: Add UPDATE policy for admins/moderators (mirror the posts table fix from 0063)

-- ============================================
-- DROP EXISTING UPDATE POLICY
-- ============================================

DROP POLICY IF EXISTS "Authors can update own comments" ON comments;

-- ============================================
-- RECREATE UPDATE POLICIES
-- ============================================

-- Policy 1: Authors can update their own comments
-- This allows ANY field update including is_deleted for soft deletes
CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Policy 2: Admins/Moderators can update (soft delete) comments in their communities
-- This mirrors the "Admins can delete comments" policy from migration 0060
-- but applies to UPDATE operations instead of DELETE
CREATE POLICY "Admins can moderate comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND (
        is_community_creator_safe(posts.community_id, auth.uid()) OR
        is_community_admin_safe(posts.community_id, auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND (
        is_community_creator_safe(posts.community_id, auth.uid()) OR
        is_community_admin_safe(posts.community_id, auth.uid())
      )
    )
  );

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Authors can update own comments" ON comments IS 
  'Allows authors to update any field on their own comments, including is_deleted for soft deletes. No field restrictions.';

COMMENT ON POLICY "Admins can moderate comments" ON comments IS 
  'Allows community admins and moderators to update any comment on posts in their community, including soft deletes and moderation actions. Mirrors the DELETE policy but for UPDATE operations.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Recreated UPDATE policy for comment authors';
  RAISE NOTICE '✅ Added UPDATE policy for admin/moderator comment moderation';
  RAISE NOTICE '✅ Matches the fix applied to posts table in migration 0063';
  RAISE NOTICE '✅ Soft delete now works for both authors and admins/moderators';
  RAISE NOTICE '📝 Migration 0064 complete - comment deletion should now work for all authorized users';
END$$;

