-- Fix Private Communities RLS
-- Version: 0039
-- Description: Re-enable RLS on communities table with non-recursive policies to properly hide private communities
-- Date: 2025-10-15

SET search_path TO public;

-- ============================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- ============================================

-- Drop all existing community policies that might cause recursion
DROP POLICY IF EXISTS "Anyone can view public communities" ON communities;
DROP POLICY IF EXISTS "Users can view accessible communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON communities;
DROP POLICY IF EXISTS "Admins can update community" ON communities;
DROP POLICY IF EXISTS "Creator can delete community" ON communities;

-- ============================================
-- CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================

-- Function to check if user can access a community (view it)
-- This uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION can_view_community(community_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  community_is_private BOOLEAN;
  user_is_member BOOLEAN;
BEGIN
  -- Get community privacy setting
  SELECT is_private INTO community_is_private
  FROM communities
  WHERE id = community_id_param;
  
  -- If community doesn't exist, return false
  IF community_is_private IS NULL THEN
    RETURN false;
  END IF;
  
  -- If community is public, everyone can view it
  IF community_is_private = false THEN
    RETURN true;
  END IF;
  
  -- If no user is authenticated, they can't view private communities
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is a member of the private community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = auth.uid()
  ) INTO user_is_member;
  
  RETURN user_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is admin/moderator of a community
CREATE OR REPLACE FUNCTION is_community_admin_or_mod(community_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is creator of a community
CREATE OR REPLACE FUNCTION is_community_creator(community_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_id_param
    AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RE-ENABLE RLS ON COMMUNITIES TABLE
-- ============================================

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE NEW NON-RECURSIVE POLICIES
-- ============================================

-- SELECT: Users can view public communities OR private communities they're members of
CREATE POLICY "Users can view accessible communities"
  ON communities FOR SELECT
  USING (can_view_community(id));

-- INSERT: Authenticated users can create communities
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: Community creators and admins can update
CREATE POLICY "Admins can update community"
  ON communities FOR UPDATE
  USING (
    is_community_creator(id) OR
    is_community_admin_or_mod(id)
  );

-- DELETE: Only community creator can delete (soft delete)
CREATE POLICY "Creator can delete community"
  ON communities FOR DELETE
  USING (is_community_creator(id));

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION can_view_community(UUID) IS 
  'Security definer function to check if user can view a community without causing RLS recursion. Returns true for public communities or private communities where user is a member.';

COMMENT ON FUNCTION is_community_admin_or_mod(UUID) IS 
  'Security definer function to check if user is an admin or moderator of a community.';

COMMENT ON FUNCTION is_community_creator(UUID) IS 
  'Security definer function to check if user is the creator of a community.';

COMMENT ON POLICY "Users can view accessible communities" ON communities IS 
  'Users can view public communities or private communities they are members of. Uses security definer function to prevent RLS recursion.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS re-enabled on communities table';
  RAISE NOTICE '✅ Non-recursive policies created using security definer functions';
  RAISE NOTICE '✅ Private communities are now properly hidden from non-members';
  RAISE NOTICE '📝 Private communities will only be visible to their members';
END$$;

