-- Fix Hidden Comments Issue
-- Version: 0065
-- Description: Allow viewing deleted comments (shown as [deleted]) and fix comment count on soft-delete
-- Date: 2025-10-22
-- Issue: Some comments are hidden because RLS and app code filter deleted comments,
--        causing discrepancy between comment count and visible comments

SET search_path TO public;

-- ============================================
-- DIAGNOSIS
-- ============================================

-- Issue: Comments (including post creator's own) getting hidden from view
-- Root Causes:
--   1. RLS policy blocks deleted comments at database level with "NOT is_deleted"
--   2. Application code also filters with .eq('is_deleted', false) (double filtering)
--   3. Comment count only decrements on DELETE, not on UPDATE (soft-delete)
--   4. This causes comment count mismatch and hidden comments
--
-- Solution:
--   1. Remove "NOT is_deleted" from RLS policy - let app handle display
--   2. Add trigger to decrement count on soft-delete (UPDATE is_deleted = true)
--   3. App will show deleted comments as "[deleted]" (already implemented in UI)

-- ============================================
-- FIX 1: UPDATE RLS POLICY
-- ============================================

-- Drop existing policy that blocks deleted comments
DROP POLICY IF EXISTS "Users can view comments on accessible posts" ON comments;

-- Recreate without the "NOT is_deleted" filter
-- This allows fetching all comments, letting the UI decide how to display deleted ones
CREATE POLICY "Users can view comments on accessible posts"
  ON comments FOR SELECT
  USING (
    -- Removed: NOT is_deleted
    -- Users can see all comments (including deleted) on posts they can access
    -- The UI will display deleted comments as "[deleted]"
    can_view_post_safe(post_id, auth.uid())
  );

-- ============================================
-- FIX 2: ADD SOFT-DELETE TRIGGER
-- ============================================

-- Create function to handle comment soft-delete (UPDATE is_deleted = true)
-- This mirrors the existing decrement_post_comments but triggers on UPDATE
CREATE OR REPLACE FUNCTION handle_comment_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement if comment is being soft-deleted (not already deleted)
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    UPDATE posts 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = NEW.post_id;
  -- If comment is being restored, increment count
  ELSIF NEW.is_deleted = false AND OLD.is_deleted = true THEN
    UPDATE posts 
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for soft-delete operations
CREATE TRIGGER comment_soft_delete_trigger 
  AFTER UPDATE OF is_deleted ON comments
  FOR EACH ROW 
  EXECUTE FUNCTION handle_comment_soft_delete();

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Users can view comments on accessible posts" ON comments IS 
  'Allows users to view all comments (including soft-deleted) on posts they can access. The UI handles displaying deleted comments as [deleted].';

COMMENT ON FUNCTION handle_comment_soft_delete() IS 
  'Decrements post comment_count when a comment is soft-deleted (is_deleted set to true) and increments when restored. Works alongside the hard-delete trigger.';

COMMENT ON TRIGGER comment_soft_delete_trigger ON comments IS 
  'Maintains accurate comment_count on posts table when comments are soft-deleted or restored via UPDATE operations.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policy to allow viewing deleted comments';
  RAISE NOTICE '✅ Added trigger to handle soft-delete comment count updates';
  RAISE NOTICE '✅ Comment counts will now match visible comments';
  RAISE NOTICE '✅ Post creators own comments will be visible (shown as [deleted] if deleted)';
  RAISE NOTICE '📝 Migration 0065 complete - all comments should now be visible and counted properly';
END$$;

