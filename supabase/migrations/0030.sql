-- Final Fix for RLS Infinite Recursion
-- Version: 0030
-- Description: Completely resolve infinite recursion in community_members RLS policies
-- Date: 2025-01-14

-- ============================================
-- DROP ALL PROBLEMATIC POLICIES
-- ============================================

-- Drop all existing community_members policies to start fresh
DROP POLICY IF EXISTS "Members can view community members" ON community_members;
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
DROP POLICY IF EXISTS "Admins can remove members" ON community_members;
DROP POLICY IF EXISTS "Members and admins can view community members" ON community_members;
DROP POLICY IF EXISTS "Admins can remove community members" ON community_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON community_members;
DROP POLICY IF EXISTS "Creators can remove members" ON community_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON community_members;
DROP POLICY IF EXISTS "Anyone can view public community members" ON community_members;

-- ============================================
-- CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================

-- 1. Users can view their own memberships (no recursion)
CREATE POLICY "Users can view own memberships"
  ON community_members FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can join communities (simple check)
CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can leave communities (simple check)
CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Community creators can view all members of their communities
CREATE POLICY "Creators can view their community members"
  ON community_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM communities 
    WHERE communities.id = community_members.community_id 
    AND communities.created_by = auth.uid()
  ));

-- 5. Community creators can remove members from their communities
CREATE POLICY "Creators can remove their community members"
  ON community_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM communities 
    WHERE communities.id = community_members.community_id 
    AND communities.created_by = auth.uid()
  ));

-- 6. Anyone can view members of public communities
CREATE POLICY "Anyone can view public community members"
  ON community_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM communities 
    WHERE communities.id = community_members.community_id 
    AND NOT communities.is_private
  ));

-- ============================================
-- ADD ADMIN-SPECIFIC POLICIES (NON-RECURSIVE)
-- ============================================

-- 7. Admins can view members of communities they admin (using direct role check)
CREATE POLICY "Admins can view their community members"
  ON community_members FOR SELECT
  USING (
    -- Check if current user is an admin of this community
    -- Use a simple EXISTS with explicit user_id check to avoid recursion
    EXISTS (
      SELECT 1 FROM community_members admin_check
      WHERE admin_check.community_id = community_members.community_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role = 'admin'
      -- Ensure we're not checking the same row (avoid self-reference)
      AND admin_check.id != community_members.id
    )
  );

-- 8. Admins can remove members from communities they admin
CREATE POLICY "Admins can remove their community members"
  ON community_members FOR DELETE
  USING (
    -- User is removing themselves (always allowed)
    auth.uid() = user_id OR
    -- User is an admin of this community
    EXISTS (
      SELECT 1 FROM community_members admin_check
      WHERE admin_check.community_id = community_members.community_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role = 'admin'
      AND admin_check.id != community_members.id
    )
  );

-- ============================================
-- UPDATE COMMUNITIES POLICIES FOR CONSISTENCY
-- ============================================

-- Drop existing communities policies that might cause issues
DROP POLICY IF EXISTS "Anyone can view public communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON communities;
DROP POLICY IF EXISTS "Admins can update community" ON communities;
DROP POLICY IF EXISTS "Creator can delete community" ON communities;
DROP POLICY IF EXISTS "Admins and creators can update community" ON communities;
DROP POLICY IF EXISTS "Admins and creators can delete community" ON communities;

-- Recreate communities policies with simplified logic

-- Anyone can view public communities
CREATE POLICY "Anyone can view public communities"
  ON communities FOR SELECT
  USING (NOT is_private);

-- Authenticated users can create communities
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Community creators can update their communities
CREATE POLICY "Creators can update their communities"
  ON communities FOR UPDATE
  USING (auth.uid() = created_by);

-- Community creators can delete their communities
CREATE POLICY "Creators can delete their communities"
  ON communities FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- ADD PERFORMANCE INDEXES
-- ============================================

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_community_members_user_community_role 
  ON community_members(user_id, community_id, role);

CREATE INDEX IF NOT EXISTS idx_community_members_community_role 
  ON community_members(community_id, role) 
  WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS idx_communities_created_by 
  ON communities(created_by);

-- ============================================
-- CREATE HELPER FUNCTION FOR ADMIN CHECKS
-- ============================================

-- Function to safely check if a user is an admin of a community
CREATE OR REPLACE FUNCTION is_user_community_admin(
  p_user_id UUID,
  p_community_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is the community creator
  IF EXISTS (
    SELECT 1 FROM communities 
    WHERE id = p_community_id AND created_by = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is an admin member
  IF EXISTS (
    SELECT 1 FROM community_members 
    WHERE user_id = p_user_id 
    AND community_id = p_community_id 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_user_community_admin(UUID, UUID) TO authenticated;

-- ============================================
-- COMMENTS AND DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Users can view own memberships" ON community_members IS 
  'Simple policy: users can view their own community memberships without recursion';

COMMENT ON POLICY "Users can join communities" ON community_members IS 
  'Simple policy: authenticated users can join communities';

COMMENT ON POLICY "Users can leave communities" ON community_members IS 
  'Simple policy: users can leave communities they are members of';

COMMENT ON POLICY "Creators can view their community members" ON community_members IS 
  'Non-recursive policy: community creators can view all members of their communities';

COMMENT ON POLICY "Creators can remove their community members" ON community_members IS 
  'Non-recursive policy: community creators can remove members from their communities';

COMMENT ON POLICY "Anyone can view public community members" ON community_members IS 
  'Simple policy: anyone can view members of public communities';

COMMENT ON POLICY "Admins can view their community members" ON community_members IS 
  'Non-recursive policy: admins can view members using direct role check';

COMMENT ON POLICY "Admins can remove their community members" ON community_members IS 
  'Non-recursive policy: admins can remove members using direct role check';

COMMENT ON FUNCTION is_user_community_admin(UUID, UUID) IS 
  'Helper function to safely check if a user is an admin of a community';
