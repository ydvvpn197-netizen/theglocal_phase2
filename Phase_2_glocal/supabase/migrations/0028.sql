-- Fix Community Issues Migration
-- Version: 0028
-- Description: Fix join community, posts loading, and deletion issues
-- Date: 2025-10-13
-- Idempotency: This migration drops policies before creating them so it can be re-run safely.

-- ============================================
-- FIX POSTS RLS - Allow viewing posts in public communities
-- ============================================

-- Drop any existing policies with the same names first
DROP POLICY IF EXISTS "Members can view community posts" ON posts;
DROP POLICY IF EXISTS "Users can view posts in accessible communities" ON posts;

-- Create a more permissive policy for viewing posts
CREATE POLICY "Users can view posts in accessible communities"
  ON posts FOR SELECT
  USING (
    NOT is_deleted AND
    (
      -- Posts in public communities are visible to everyone
      community_id IN (
        SELECT id FROM communities WHERE NOT is_private AND (is_deleted IS FALSE OR is_deleted IS NULL)
      ) OR
      -- Posts in communities where user is a member
      community_id IN (
        SELECT community_id FROM community_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- FIX COMMUNITY_MEMBERS RLS - Ensure proper join functionality
-- ============================================

DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Authenticated users can join communities" ON community_members;

CREATE POLICY "Authenticated users can join communities"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    -- Ensure community exists and is not deleted
    EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_members.community_id 
      AND (is_deleted IS FALSE OR is_deleted IS NULL)
    )
  );

-- Add policy to allow viewing community membership info for checking admin status
DROP POLICY IF EXISTS "Users can view community memberships" ON community_members;

CREATE POLICY "Users can view community memberships"
  ON community_members FOR SELECT
  USING (
    -- Users can see their own memberships
    auth.uid() = user_id OR
    -- Members can see other members of their communities
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    ) OR
    -- Anyone can see memberships of public communities (for member counts, etc.)
    community_id IN (
      SELECT id FROM communities WHERE NOT is_private
    )
  );

-- ============================================
-- FIX COMMUNITIES RLS - Ensure proper visibility
-- ============================================

DROP POLICY IF EXISTS "Anyone can view public communities" ON communities;
DROP POLICY IF EXISTS "Users can view accessible communities" ON communities;

CREATE POLICY "Users can view accessible communities"
  ON communities FOR SELECT
  USING (
    -- Public communities are visible to everyone
    NOT is_private OR
    -- Private communities are visible to members
    id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    ) OR
    -- Creators can always see their communities
    created_by = auth.uid()
  );

-- ============================================
-- FIX SOFT DELETE FUNCTION - Add better error handling and security
-- ============================================

DROP FUNCTION IF EXISTS soft_delete_community(UUID, UUID);

CREATE OR REPLACE FUNCTION soft_delete_community(
  community_id_param UUID, 
  user_id_param UUID
)
RETURNS JSON 
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
  community_record RECORD;
  archived_community_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  posts_transferred INTEGER := 0;
  deletion_time TIMESTAMPTZ := NOW();
  scheduled_deletion TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
BEGIN
  -- Get the community details
  SELECT * INTO community_record 
  FROM communities 
  WHERE id = community_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Community not found');
  END IF;
  
  IF community_record.is_deleted THEN
    RETURN json_build_object('success', false, 'error', 'Community already deleted');
  END IF;
  
  -- Verify archived community exists
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = archived_community_id) THEN
    RETURN json_build_object('success', false, 'error', 'System error: Archived community not found');
  END IF;
  
  -- Transfer all posts to archived community
  UPDATE posts 
  SET 
    community_id = archived_community_id,
    updated_at = NOW()
  WHERE community_id = community_id_param AND is_deleted = FALSE;
  
  GET DIAGNOSTICS posts_transferred = ROW_COUNT;
  
  -- Mark community as deleted
  UPDATE communities 
  SET 
    is_deleted = TRUE,
    deleted_at = deletion_time,
    deleted_by = user_id_param,
    deletion_scheduled_for = scheduled_deletion,
    updated_at = NOW()
  WHERE id = community_id_param;
  
  RETURN json_build_object(
    'success', true,
    'deleted_at', deletion_time,
    'scheduled_deletion', scheduled_deletion,
    'posts_transferred', posts_transferred
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION soft_delete_community(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_community(UUID, UUID) TO service_role;

-- ============================================
-- FIX RESTORE FUNCTION - Add SECURITY DEFINER
-- ============================================

DROP FUNCTION IF EXISTS restore_deleted_community(UUID);

CREATE OR REPLACE FUNCTION restore_deleted_community(community_id_param UUID)
RETURNS JSON 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  community_record RECORD;
  archived_community_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  posts_restored INTEGER := 0;
BEGIN
  -- Get the community details
  SELECT * INTO community_record 
  FROM communities 
  WHERE id = community_id_param AND is_deleted = TRUE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Community not found or not deleted');
  END IF;
  
  -- Check if still within recovery window
  IF community_record.deletion_scheduled_for < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Recovery window has expired');
  END IF;
  
  -- Transfer posts back from archived community
  -- Use a simpler approach: transfer all posts from archive that were created by this community's members
  UPDATE posts 
  SET 
    community_id = community_id_param,
    updated_at = NOW()
  WHERE community_id = archived_community_id 
    AND author_id IN (
      SELECT user_id FROM community_members WHERE community_id = community_id_param
    )
    AND updated_at >= community_record.deleted_at - INTERVAL '1 hour';
  
  GET DIAGNOSTICS posts_restored = ROW_COUNT;
  
  -- Restore the community
  UPDATE communities 
  SET 
    is_deleted = FALSE,
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_scheduled_for = NULL,
    updated_at = NOW()
  WHERE id = community_id_param;
  
  RETURN json_build_object(
    'success', true,
    'posts_restored', posts_restored
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION restore_deleted_community(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_community(UUID) TO service_role;

-- ============================================
-- FIX PERMANENTLY DELETE FUNCTION - Add SECURITY DEFINER
-- ============================================

DROP FUNCTION IF EXISTS permanently_delete_community(UUID);

CREATE OR REPLACE FUNCTION permanently_delete_community(community_id_param UUID)
RETURNS JSON 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  community_record RECORD;
  deleted_members INTEGER := 0;
  deleted_rules INTEGER := 0;
  deleted_invites INTEGER := 0;
  deleted_requests INTEGER := 0;
BEGIN
  -- Get the community details
  SELECT * INTO community_record 
  FROM communities 
  WHERE id = community_id_param AND is_deleted = TRUE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Community not found or not deleted');
  END IF;
  
  -- Delete community members
  DELETE FROM community_members WHERE community_id = community_id_param;
  GET DIAGNOSTICS deleted_members = ROW_COUNT;
  
  -- Delete community invites if table exists
  BEGIN
    DELETE FROM community_invites WHERE community_id = community_id_param;
    GET DIAGNOSTICS deleted_invites = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      deleted_invites := 0;
  END;
  
  -- Delete community join requests if table exists
  BEGIN
    DELETE FROM community_join_requests WHERE community_id = community_id_param;
    GET DIAGNOSTICS deleted_requests = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      deleted_requests := 0;
  END;
  
  -- Delete the community itself
  DELETE FROM communities WHERE id = community_id_param;
  
  RETURN json_build_object(
    'success', true,
    'deleted_members', deleted_members,
    'deleted_invites', deleted_invites,
    'deleted_requests', deleted_requests
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION permanently_delete_community(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION permanently_delete_community(UUID) TO service_role;

-- ============================================
-- ADD HELPFUL DEBUGGING FUNCTION
-- ============================================

-- Function to check why a user can't join a community
DROP FUNCTION IF EXISTS debug_community_join(UUID, UUID);

CREATE OR REPLACE FUNCTION debug_community_join(
  p_user_id UUID,
  p_community_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_exists BOOLEAN;
  v_community_deleted BOOLEAN;
  v_is_member BOOLEAN;
  v_community_name TEXT;
BEGIN
  -- Check if community exists
  SELECT EXISTS(SELECT 1 FROM communities WHERE id = p_community_id),
         COALESCE((SELECT is_deleted FROM communities WHERE id = p_community_id), TRUE),
         (SELECT name FROM communities WHERE id = p_community_id)
  INTO v_community_exists, v_community_deleted, v_community_name;
  
  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM community_members 
    WHERE user_id = p_user_id AND community_id = p_community_id
  ) INTO v_is_member;
  
  RETURN json_build_object(
    'community_exists', v_community_exists,
    'community_name', v_community_name,
    'community_deleted', v_community_deleted,
    'is_member', v_is_member,
    'can_join', v_community_exists AND NOT v_community_deleted AND NOT v_is_member
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION debug_community_join(UUID, UUID) TO authenticated;

-- ============================================
-- ENSURE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_posts_community_not_deleted 
  ON posts(community_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_communities_not_private_not_deleted 
  ON communities(id) WHERE NOT is_private AND (is_deleted IS FALSE OR is_deleted IS NULL);

CREATE INDEX IF NOT EXISTS idx_community_members_lookup 
  ON community_members(user_id, community_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can view posts in accessible communities" ON posts IS 
  'Allows viewing posts in public communities or communities where user is a member';

COMMENT ON POLICY "Authenticated users can join communities" ON community_members IS 
  'Allows authenticated users to join non-deleted communities';

COMMENT ON POLICY "Users can view community memberships" ON community_members IS 
  'Allows users to view memberships for membership checks and admin status';

COMMENT ON FUNCTION soft_delete_community(UUID, UUID) IS 
  'Soft deletes a community with SECURITY DEFINER to bypass RLS issues';

COMMENT ON FUNCTION debug_community_join(UUID, UUID) IS 
  'Debug function to check why a user cannot join a community';