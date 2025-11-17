-- Verify and Fix Community Join RLS Policies
-- Version: 0025
-- Description: Ensure community join functionality works correctly with proper RLS policies
-- Date: 2025-01-16

-- ============================================
-- VERIFY AND FIX COMMUNITY_MEMBERS POLICIES
-- ============================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;

-- Recreate the leave policy to ensure it works correctly
CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id);

-- Verify the INSERT policy exists (should be from 0002_rls_policies.sql)
-- This policy allows authenticated users to join communities
-- Policy: "Users can join communities"
-- Should check: auth.uid() = user_id

-- ============================================
-- ADD EXPLICIT POLICY FOR VIEWING OWN MEMBERSHIPS
-- ============================================

-- Ensure users can always view their own memberships
-- This is critical for checking admin status and membership
DROP POLICY IF EXISTS "Users can view their own memberships" ON community_members;

CREATE POLICY "Users can view their own memberships"
  ON community_members FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFY COMMUNITIES CAN BE VIEWED
-- ============================================

-- Ensure the policy for viewing public communities exists
-- Should have: "Anyone can view public communities" from migration 0011

-- ============================================
-- ADD FUNCTION TO DEBUG MEMBERSHIP ISSUES
-- ============================================

-- Function to check if a user can join a community (for debugging)
CREATE OR REPLACE FUNCTION can_user_join_community(
  p_user_id UUID,
  p_community_id UUID
)
RETURNS TABLE (
  can_join BOOLEAN,
  reason TEXT,
  is_member BOOLEAN,
  community_exists BOOLEAN
) AS $$
DECLARE
  v_is_member BOOLEAN;
  v_community_exists BOOLEAN;
  v_can_join BOOLEAN := FALSE;
  v_reason TEXT := 'Unknown';
BEGIN
  -- Check if community exists
  SELECT EXISTS (
    SELECT 1 FROM communities WHERE id = p_community_id
  ) INTO v_community_exists;
  
  IF NOT v_community_exists THEN
    RETURN QUERY SELECT FALSE, 'Community does not exist', FALSE, FALSE;
    RETURN;
  END IF;
  
  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM community_members 
    WHERE user_id = p_user_id AND community_id = p_community_id
  ) INTO v_is_member;
  
  IF v_is_member THEN
    RETURN QUERY SELECT FALSE, 'Already a member', TRUE, TRUE;
    RETURN;
  END IF;
  
  -- If not a member and community exists, can join
  v_can_join := TRUE;
  v_reason := 'Can join';
  
  RETURN QUERY SELECT v_can_join, v_reason, v_is_member, v_community_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION can_user_join_community(UUID, UUID) TO authenticated;

-- ============================================
-- ADD FUNCTION TO GET USER COMMUNITY MEMBERSHIP
-- ============================================

-- Function to get all communities a user is a member of
CREATE OR REPLACE FUNCTION get_user_communities(p_user_id UUID)
RETURNS TABLE (
  community_id UUID,
  community_name TEXT,
  community_slug TEXT,
  user_role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    cm.role,
    cm.joined_at
  FROM community_members cm
  JOIN communities c ON c.id = cm.community_id
  WHERE cm.user_id = p_user_id
  ORDER BY cm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_communities(UUID) TO authenticated;

-- ============================================
-- VERIFY ADMIN PERMISSIONS
-- ============================================

-- Ensure admins can view all members of their communities
-- This should already exist from migration 0023
-- Policy: "Members and admins can view community members"

-- Ensure admins can remove members
-- This should already exist from migration 0023
-- Policy: "Admins can remove community members"

-- ============================================
-- ADD INDEX FOR PERFORMANCE
-- ============================================

-- Add index for faster membership lookups if not exists
CREATE INDEX IF NOT EXISTS idx_community_members_user_community 
  ON community_members(user_id, community_id);

CREATE INDEX IF NOT EXISTS idx_community_members_role 
  ON community_members(role) 
  WHERE role = 'admin';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION can_user_join_community(UUID, UUID) IS 
  'Debug function to check if a user can join a community and why';

COMMENT ON FUNCTION get_user_communities(UUID) IS 
  'Get all communities a user is a member of with their role';

COMMENT ON POLICY "Users can view their own memberships" ON community_members IS 
  'Critical policy: ensures users can always check their own membership status';

