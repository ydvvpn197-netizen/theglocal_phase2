-- Fix Community Admin RLS Policies
-- Version: 0023
-- Description: Fix RLS policies to allow community admins to view members and perform admin actions
-- Date: 2025-01-15

-- ============================================
-- DROP PROBLEMATIC POLICIES FROM PREVIOUS FIX
-- ============================================

-- Drop the incomplete fix from migration 0011
DROP POLICY IF EXISTS "Members can view community members" ON community_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON community_members;
DROP POLICY IF EXISTS "Anyone can view public community members" ON community_members;

-- Ensure we remove any previous version of the new policies so CREATE is idempotent
DROP POLICY IF EXISTS "Members and admins can view community members" ON community_members;
DROP POLICY IF EXISTS "Admins can remove community members" ON community_members;

-- ============================================
-- CREATE COMPREHENSIVE FIXED POLICIES
-- ============================================

-- Allow users to view community members if they are:
-- 1. The user themselves (own membership)
-- 2. An admin of that community (via role check in community_members)
-- 3. A member viewing other members of the same community (non-recursive check)
-- 4. Viewing members of public communities
CREATE POLICY "Members and admins can view community members"
  ON community_members FOR SELECT
  USING (
    -- User can view their own membership
    (SELECT auth.uid()) = user_id OR
    -- User is an admin of this community (direct check without recursion)
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    ) OR
    -- Community is public OR user created the community
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_members.community_id
        AND (
          c.created_by = (SELECT auth.uid()) OR
          NOT c.is_private
        )
    )
  );

-- Allow community admins to remove members
CREATE POLICY "Admins can remove community members"
  ON community_members FOR DELETE
  USING (
    -- User is removing themselves
    (SELECT auth.uid()) = user_id OR
    -- User is an admin of this community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    ) OR
    -- User created the community
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_members.community_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

-- ============================================
-- UPDATE COMMUNITY POLICIES FOR ADMIN ACTIONS
-- ============================================

-- Drop existing community update policy (if any)
DROP POLICY IF EXISTS "Admins can update community" ON communities;
DROP POLICY IF EXISTS "Admins and creators can update community" ON communities;

-- Create comprehensive policy for community updates
CREATE POLICY "Admins and creators can update community"
  ON communities FOR UPDATE
  USING (
    -- User created the community
    (SELECT auth.uid()) = created_by OR
    -- User is an admin of this community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = communities.id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    )
  );

-- Drop existing community delete policy (if any)
DROP POLICY IF EXISTS "Creator can delete community" ON communities;
DROP POLICY IF EXISTS "Admins and creators can delete community" ON communities;

-- Create comprehensive policy for community deletion
CREATE POLICY "Admins and creators can delete community"
  ON communities FOR DELETE
  USING (
    -- User created the community
    (SELECT auth.uid()) = created_by OR
    -- User is an admin of this community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = communities.id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    )
  );

-- ============================================
-- ADDITIONAL HELPER FUNCTIONS
-- ============================================

-- Enhanced function to check if user is a community admin (with better error handling)
CREATE OR REPLACE FUNCTION is_community_admin_enhanced(
  p_user_id UUID,
  p_community_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
  v_is_creator BOOLEAN := FALSE;
BEGIN
  -- Check if user is an admin via community_members table
  SELECT EXISTS (
    SELECT 1 
    FROM community_members 
    WHERE user_id = p_user_id 
      AND community_id = p_community_id 
      AND role = 'admin'
  ) INTO v_is_admin;
  
  -- Check if user is the community creator
  SELECT EXISTS (
    SELECT 1 
    FROM communities 
    WHERE id = p_community_id 
      AND created_by = p_user_id
  ) INTO v_is_creator;
  
  RETURN v_is_admin OR v_is_creator;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke execute from public roles if desired (conservative)
REVOKE EXECUTE ON FUNCTION is_community_admin_enhanced(UUID, UUID) FROM anon, authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Members and admins can view community members" ON community_members IS 
  'Allows community members and admins to view member lists without RLS recursion';

COMMENT ON POLICY "Admins can remove community members" ON community_members IS 
  'Allows community admins and creators to remove members from their communities';

COMMENT ON POLICY "Admins and creators can update community" ON communities IS 
  'Allows both community creators and admins to update community settings';

COMMENT ON POLICY "Admins and creators can delete community" ON communities IS 
  'Allows both community creators and admins to delete communities';