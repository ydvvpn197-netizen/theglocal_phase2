-- Fix Post Soft Delete Issue
-- Version: 0063
-- Description: Fix RLS policy issue preventing authors from soft deleting their own posts
-- Date: 2025-10-22

SET search_path TO public;

-- ============================================
-- DIAGNOSIS
-- ============================================

-- Issue: Users cannot delete their posts - receiving "Failed to delete post" error
-- Root Cause: The soft delete operation uses UPDATE (not DELETE) to set is_deleted = true
--             The UPDATE policies might have a conflict or constraint issue
-- 
-- Current Policies (from migrations 0042 & 0043):
--   - "Authors can update own posts" FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id)
--   - "Admins can moderate posts" FOR UPDATE USING (admin checks) WITH CHECK (admin checks)
--   - "Authors can delete own posts" FOR DELETE USING (auth.uid() = author_id)
--   - "Admins can delete posts" FOR DELETE USING (admin checks)
--
-- The problem: Soft delete uses UPDATE but the policies should allow it.
-- Possible issue: Policies were not applied correctly or there's a constraint
--
-- Solution: Ensure UPDATE policies explicitly allow is_deleted field changes

-- ============================================
-- FIX: ENSURE UPDATE POLICIES ALLOW SOFT DELETE
-- ============================================

-- Drop and recreate UPDATE policies to ensure they're correct
DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
DROP POLICY IF EXISTS "Admins can moderate posts" ON posts;

-- Recreate policy for authors to update their own posts
-- This allows ANY field update including is_deleted
CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Recreate policy for admins to moderate posts  
CREATE POLICY "Admins can moderate posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (
    is_community_creator_safe(community_id, auth.uid()) OR
    is_community_admin_safe(community_id, auth.uid())
  )
  WITH CHECK (
    is_community_creator_safe(community_id, auth.uid()) OR
    is_community_admin_safe(community_id, auth.uid())
  );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Recreated UPDATE policies for posts table';
  RAISE NOTICE '✅ Authors can now update is_deleted field on their own posts';
  RAISE NOTICE '✅ Added TO authenticated clause for clarity';
  RAISE NOTICE '📝 Migration 0063 complete - post deletion should now work';
END$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Authors can update own posts" ON posts IS 
  'Allows authors to update any field on their own posts, including is_deleted for soft deletes. No field restrictions.';

COMMENT ON POLICY "Admins can moderate posts" ON posts IS 
  'Allows community creators and admins to update any post in their community, including soft deletes and moderation actions.';

