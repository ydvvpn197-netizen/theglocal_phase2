-- Fix Community Members Role Assignment
-- Version: 0059
-- Description: Add missing UPDATE policy for community_members to allow admins to assign roles
-- Date: 2025-10-21
-- Issue: Migration 0042 dropped the UPDATE policy from 0035 but never recreated it

SET search_path TO public;

-- ============================================
-- PROBLEM
-- ============================================
-- Migration 0035 had: USING (auth.uid() = user_id) which only allowed self-updates
-- Migration 0042 dropped all policies but forgot to add UPDATE policy for community_members
-- Result: Community admins cannot update member roles (blocked by RLS at DB layer)

-- ============================================
-- SOLUTION: ADD UPDATE POLICY
-- ============================================

-- Drop the old restrictive policy if it exists (from migration 0035)
DROP POLICY IF EXISTS "update_memberships" ON community_members;

-- Create new UPDATE policy that allows admins/creators to manage roles
CREATE POLICY "Creators and admins can update member roles"
  ON community_members FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own memberships (for backwards compatibility)
    auth.uid() = user_id
    OR
    -- Community creators can update any member's role
    is_community_creator_safe(community_id, auth.uid())
    OR
    -- Community admins/moderators can update member roles
    -- (Application layer enforces proper role hierarchy via canChangeRole())
    is_community_admin_safe(community_id, auth.uid())
  )
  WITH CHECK (
    -- Same conditions as USING - allow the update if authorized
    auth.uid() = user_id
    OR
    is_community_creator_safe(community_id, auth.uid())
    OR
    is_community_admin_safe(community_id, auth.uid())
  );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verify the UPDATE policy exists
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'community_members' 
  AND cmd = 'UPDATE';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'UPDATE policy was not created!';
  END IF;
  
  RAISE NOTICE '✅ UPDATE policy created for community_members';
  RAISE NOTICE '✅ Community admins can now assign roles to members';
  RAISE NOTICE '📝 Migration 0059 complete';
END$$;

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Creators and admins can update member roles" ON community_members IS 
  'Allows community creators and admins to update member roles. Uses SECURITY DEFINER functions from migration 0042 to prevent RLS recursion. Application layer enforces role hierarchy rules via canChangeRole() function.';

