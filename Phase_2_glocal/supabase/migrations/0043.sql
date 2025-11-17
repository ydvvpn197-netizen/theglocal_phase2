-- Fix Post and Comment Update RLS Policies
-- Version: 0043
-- Description: Add WITH CHECK clause to post and comment update policies to allow soft delete
-- Date: 2025-10-15

SET search_path TO public;

-- ============================================
-- FIX POSTS TABLE UPDATE POLICIES
-- ============================================

-- Drop existing update policies
DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
DROP POLICY IF EXISTS "Admins can moderate posts" ON posts;

-- Recreate with WITH CHECK clause
-- UPDATE: Authors can update their own posts (within time limit handled by app)
CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- UPDATE: Community admins can moderate posts
CREATE POLICY "Admins can moderate posts"
  ON posts FOR UPDATE
  USING (
    is_community_creator_safe(community_id, auth.uid()) OR
    is_community_admin_safe(community_id, auth.uid())
  )
  WITH CHECK (
    is_community_creator_safe(community_id, auth.uid()) OR
    is_community_admin_safe(community_id, auth.uid())
  );

-- ============================================
-- FIX COMMENTS TABLE UPDATE POLICIES
-- ============================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Authors can update own comments" ON comments;

-- Recreate with WITH CHECK clause
-- UPDATE: Authors can update their own comments
CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed post update RLS policies';
  RAISE NOTICE '✅ Fixed comment update RLS policies';
  RAISE NOTICE '✅ Added WITH CHECK clauses to allow soft delete operations';
  RAISE NOTICE '📝 Migration 0043 complete';
END$$;

