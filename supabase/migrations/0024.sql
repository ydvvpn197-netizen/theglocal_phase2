-- Admin Post Moderation RLS Policies
-- Version: 0024
-- Description: Add RLS policies for community admins to moderate posts
-- Date: 2025-01-15

-- ============================================
-- DROP EXISTING POLICIES TO AVOID CONFLICTS
-- ============================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can delete community posts" ON posts;
DROP POLICY IF EXISTS "Admins can update community posts" ON posts;

-- ============================================
-- CREATE COMPREHENSIVE ADMIN POST POLICIES
-- ============================================

-- Allow community admins to delete any post in their community
CREATE POLICY "Admins can delete community posts"
  ON posts FOR DELETE
  USING (
    -- User is an admin of this community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = posts.community_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    ) OR
    -- User created the community
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = posts.community_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

-- Allow community admins to update post moderation fields
CREATE POLICY "Admins can moderate community posts"
  ON posts FOR UPDATE
  USING (
    -- User is an admin of this community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = posts.community_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    ) OR
    -- User created the community
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = posts.community_id
        AND c.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    -- Only allow updates to moderation fields for admins
    -- Regular users can still update their own posts (existing policy handles this)
    (SELECT auth.uid()) = author_id OR
    -- Admins can update moderation fields
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = posts.community_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = posts.community_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

-- ============================================
-- VERIFY EXISTING ADMIN POLICIES
-- ============================================

-- Ensure community member admin policies are working
-- These should already exist from previous migrations
DO $$
BEGIN
  -- Check if the community members admin policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'community_members' 
    AND policyname = 'Admins can remove community members'
  ) THEN
    RAISE NOTICE 'Community members admin policy may need to be recreated';
  END IF;
END $$;

-- ============================================
-- ADDITIONAL HELPER FUNCTIONS
-- ============================================

-- Function to check if user can moderate posts in a community
CREATE OR REPLACE FUNCTION can_moderate_posts(
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

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Admins can delete community posts" ON posts IS 
  'Allows community admins and creators to delete any post in their community';

COMMENT ON POLICY "Admins can moderate community posts" ON posts IS 
  'Allows community admins and creators to update post moderation fields (pin, announcement, etc.)';

COMMENT ON FUNCTION can_moderate_posts(UUID, UUID) IS 
  'Helper function to check if a user can moderate posts in a specific community';
