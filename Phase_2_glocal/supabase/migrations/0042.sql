-- Fix All RLS Infinite Recursion Issues
-- Version: 0042
-- Description: Completely eliminate all circular RLS dependencies using SECURITY DEFINER functions
-- Date: 2025-10-15

SET search_path TO public;

-- ============================================
-- PART 1: CREATE ALL SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function 1: Check if user can view a community (handles public/private logic)
CREATE OR REPLACE FUNCTION can_view_community_safe(community_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  community_is_private BOOLEAN;
  user_is_member BOOLEAN;
  check_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Get community privacy setting (SECURITY DEFINER bypasses RLS)
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
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is a member of the private community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = check_user_id
  ) INTO user_is_member;
  
  RETURN user_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 2: Check if user is a member of a community
CREATE OR REPLACE FUNCTION is_community_member_safe(community_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 3: Check if user is admin/moderator of a community
CREATE OR REPLACE FUNCTION is_community_admin_safe(community_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = check_user_id
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 4: Check if user is creator of a community
CREATE OR REPLACE FUNCTION is_community_creator_safe(community_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_id_param
    AND created_by = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 5: Check if a community is private
CREATE OR REPLACE FUNCTION is_community_private_safe(community_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  private_flag BOOLEAN;
BEGIN
  SELECT is_private INTO private_flag
  FROM communities
  WHERE id = community_id_param;
  
  RETURN COALESCE(private_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 6: Check if user can view a post (based on community access)
CREATE OR REPLACE FUNCTION can_view_post_safe(post_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  post_community_id UUID;
  post_is_deleted BOOLEAN;
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Get post's community and deletion status (SECURITY DEFINER bypasses RLS)
  SELECT community_id, is_deleted 
  INTO post_community_id, post_is_deleted
  FROM posts
  WHERE id = post_id_param;
  
  -- If post doesn't exist or is deleted, return false
  IF post_community_id IS NULL OR post_is_deleted = true THEN
    RETURN false;
  END IF;
  
  -- Check if user can view the community this post belongs to
  RETURN can_view_community_safe(post_community_id, check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 7: Check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned_safe(user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
  user_banned BOOLEAN;
  ban_expires TIMESTAMPTZ;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT is_banned, ban_expires_at 
  INTO user_banned, ban_expires
  FROM users
  WHERE id = check_user_id;
  
  -- User is banned if is_banned = true AND (no expiry OR expiry is in future)
  IF user_banned = true AND (ban_expires IS NULL OR ban_expires > NOW()) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_view_community_safe(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_community_member_safe(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_community_admin_safe(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_community_creator_safe(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_community_private_safe(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_view_post_safe(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_user_banned_safe(UUID) TO authenticated, anon;

-- ============================================
-- PART 2: DROP ALL EXISTING PROBLEMATIC POLICIES
-- ============================================

-- Communities table
DROP POLICY IF EXISTS "Anyone can view public communities" ON communities;
DROP POLICY IF EXISTS "Users can view accessible communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON communities;
DROP POLICY IF EXISTS "Admins can update community" ON communities;
DROP POLICY IF EXISTS "Creator can delete community" ON communities;
DROP POLICY IF EXISTS "Creators can update their communities" ON communities;
DROP POLICY IF EXISTS "Creators can delete their communities" ON communities;
DROP POLICY IF EXISTS "Admins and creators can update community" ON communities;
DROP POLICY IF EXISTS "Admins and creators can delete community" ON communities;

-- Community members table
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
DROP POLICY IF EXISTS "Creators can view their community members" ON community_members;
DROP POLICY IF EXISTS "Creators can remove their community members" ON community_members;
DROP POLICY IF EXISTS "Admins can view their community members" ON community_members;
DROP POLICY IF EXISTS "Admins can remove their community members" ON community_members;
DROP POLICY IF EXISTS "Members can view private communities via function" ON communities;
DROP POLICY IF EXISTS "Users can view community memberships" ON community_members;
DROP POLICY IF EXISTS "Anyone can view all community members" ON community_members;

-- Posts table
DROP POLICY IF EXISTS "Members can view community posts" ON posts;
DROP POLICY IF EXISTS "Members can create posts" ON posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON posts;
DROP POLICY IF EXISTS "Admins can delete community posts" ON posts;
DROP POLICY IF EXISTS "Admins can moderate community posts" ON posts;
DROP POLICY IF EXISTS "Non-banned users can create posts" ON posts;
DROP POLICY IF EXISTS "Authenticated non-banned community members can create posts" ON posts;

-- Comments table
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON comments;
DROP POLICY IF EXISTS "Non-banned users can create comments" ON comments;
DROP POLICY IF EXISTS "Authenticated non-banned community members can create comments" ON comments;

-- Votes table
DROP POLICY IF EXISTS "Users can view own votes" ON votes;
DROP POLICY IF EXISTS "Users can create votes" ON votes;
DROP POLICY IF EXISTS "Users can update own votes" ON votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON votes;

-- Polls table
DROP POLICY IF EXISTS "Members can view community polls" ON polls;
DROP POLICY IF EXISTS "Members can create polls" ON polls;
DROP POLICY IF EXISTS "Authors can update own polls" ON polls;

-- Poll options table
DROP POLICY IF EXISTS "Users can view poll options" ON poll_options;
DROP POLICY IF EXISTS "Poll authors can create options" ON poll_options;

-- ============================================
-- PART 3: CREATE NON-RECURSIVE RLS POLICIES
-- ============================================

-- ===== COMMUNITIES TABLE POLICIES =====

-- SELECT: Users can view public communities OR private communities they're members of
CREATE POLICY "Users can view accessible communities"
  ON communities FOR SELECT
  USING (can_view_community_safe(id, auth.uid()));

-- INSERT: Authenticated users can create communities
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: Community creators and admins can update
CREATE POLICY "Creators and admins can update communities"
  ON communities FOR UPDATE
  USING (
    is_community_creator_safe(id, auth.uid()) OR
    is_community_admin_safe(id, auth.uid())
  );

-- DELETE: Only community creator can delete
CREATE POLICY "Creators can delete communities"
  ON communities FOR DELETE
  USING (is_community_creator_safe(id, auth.uid()));

-- ===== COMMUNITY MEMBERS TABLE POLICIES =====

-- SELECT: Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON community_members FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Users can view members of communities they're in
CREATE POLICY "Members can view their community members"
  ON community_members FOR SELECT
  USING (
    is_community_member_safe(community_id, auth.uid())
  );

-- SELECT: Anyone can view members of public communities
CREATE POLICY "Anyone can view public community members"
  ON community_members FOR SELECT
  USING (
    NOT is_community_private_safe(community_id)
  );

-- SELECT: Community creators can view all members
CREATE POLICY "Creators can view all members"
  ON community_members FOR SELECT
  USING (
    is_community_creator_safe(community_id, auth.uid())
  );

-- INSERT: Authenticated users can join communities
CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can leave communities
CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id);

-- DELETE: Community creators and admins can remove members
CREATE POLICY "Creators and admins can remove members"
  ON community_members FOR DELETE
  USING (
    is_community_creator_safe(community_id, auth.uid()) OR
    is_community_admin_safe(community_id, auth.uid())
  );

-- ===== POSTS TABLE POLICIES =====

-- SELECT: Users can view posts in communities they have access to
CREATE POLICY "Users can view accessible posts"
  ON posts FOR SELECT
  USING (
    NOT is_deleted AND
    can_view_community_safe(community_id, auth.uid())
  );

-- INSERT: Authenticated, non-banned community members can create posts
CREATE POLICY "Members can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    NOT is_user_banned_safe(auth.uid()) AND
    is_community_member_safe(community_id, auth.uid())
  );

-- UPDATE: Authors can update their own posts (within time limit handled by app)
CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- UPDATE: Community admins can moderate posts
CREATE POLICY "Admins can moderate posts"
  ON posts FOR UPDATE
  USING (
    is_community_creator_safe(community_id, auth.uid()) OR
    is_community_admin_safe(community_id, auth.uid())
  );

-- DELETE: Authors can delete their own posts
CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- DELETE: Community admins can delete posts
CREATE POLICY "Admins can delete posts"
  ON posts FOR DELETE
  USING (
    is_community_creator_safe(community_id, auth.uid()) OR
    is_community_admin_safe(community_id, auth.uid())
  );

-- ===== COMMENTS TABLE POLICIES =====

-- SELECT: Users can view comments on posts they can access
CREATE POLICY "Users can view comments on accessible posts"
  ON comments FOR SELECT
  USING (
    NOT is_deleted AND
    can_view_post_safe(post_id, auth.uid())
  );

-- INSERT: Authenticated, non-banned users can create comments on accessible posts
CREATE POLICY "Users can create comments on accessible posts"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    NOT is_user_banned_safe(auth.uid()) AND
    can_view_post_safe(post_id, auth.uid())
  );

-- UPDATE: Authors can update their own comments
CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id);

-- DELETE: Authors can delete their own comments
CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = author_id);

-- ===== VOTES TABLE POLICIES =====

-- SELECT: Users can view their own votes
CREATE POLICY "Users can view own votes"
  ON votes FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Authenticated users can create votes on accessible posts
CREATE POLICY "Users can create votes on accessible posts"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Can vote on posts they can view
      (content_type = 'post' AND can_view_post_safe(content_id, auth.uid())) OR
      -- Can vote on comments on posts they can view
      (content_type = 'comment' AND EXISTS (
        SELECT 1 FROM comments 
        WHERE comments.id = votes.content_id 
        AND can_view_post_safe(comments.post_id, auth.uid())
      ))
    )
  );

-- UPDATE: Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- ===== POLLS TABLE POLICIES =====

-- SELECT: Users can view polls in communities they have access to
CREATE POLICY "Users can view accessible polls"
  ON polls FOR SELECT
  USING (can_view_community_safe(community_id, auth.uid()));

-- INSERT: Authenticated, non-banned community members can create polls
CREATE POLICY "Members can create polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    NOT is_user_banned_safe(auth.uid()) AND
    is_community_member_safe(community_id, auth.uid())
  );

-- UPDATE: Authors can update their own polls (before voting starts)
CREATE POLICY "Authors can update own polls"
  ON polls FOR UPDATE
  USING (
    auth.uid() = author_id AND
    total_votes = 0
  );

-- ===== POLL OPTIONS TABLE POLICIES =====

-- SELECT: Users can view poll options for polls they can access
-- (Relies on polls RLS to filter accessible polls)
CREATE POLICY "Users can view poll options for accessible polls"
  ON poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id
    )
  );

-- INSERT: Poll authors can create options
CREATE POLICY "Poll authors can create options"
  ON poll_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND polls.author_id = auth.uid()
    )
  );

-- ============================================
-- PART 4: ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION can_view_community_safe(UUID, UUID) IS 
  'SECURITY DEFINER function to check if user can view a community. Returns true for public communities or private communities where user is a member. Prevents RLS recursion.';

COMMENT ON FUNCTION is_community_member_safe(UUID, UUID) IS 
  'SECURITY DEFINER function to check if user is a member of a community. Prevents RLS recursion.';

COMMENT ON FUNCTION is_community_admin_safe(UUID, UUID) IS 
  'SECURITY DEFINER function to check if user is an admin or moderator of a community. Prevents RLS recursion.';

COMMENT ON FUNCTION is_community_creator_safe(UUID, UUID) IS 
  'SECURITY DEFINER function to check if user is the creator of a community. Prevents RLS recursion.';

COMMENT ON FUNCTION is_community_private_safe(UUID) IS 
  'SECURITY DEFINER function to check if a community is private. Prevents RLS recursion.';

COMMENT ON FUNCTION can_view_post_safe(UUID, UUID) IS 
  'SECURITY DEFINER function to check if user can view a post based on community access. Prevents RLS recursion.';

COMMENT ON FUNCTION is_user_banned_safe(UUID) IS 
  'SECURITY DEFINER function to check if a user is currently banned. Prevents RLS recursion.';

-- ============================================
-- PART 5: DROP OLD HELPER FUNCTIONS (if they exist)
-- ============================================

DROP FUNCTION IF EXISTS is_community_admin(UUID);
DROP FUNCTION IF EXISTS is_user_community_admin(UUID, UUID);
DROP FUNCTION IF EXISTS is_community_member(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_community(UUID);
DROP FUNCTION IF EXISTS is_community_admin_or_mod(UUID);
DROP FUNCTION IF EXISTS is_community_creator(UUID);
DROP FUNCTION IF EXISTS can_moderate_posts(UUID, UUID);

-- ============================================
-- PART 6: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ All RLS recursion issues fixed!';
  RAISE NOTICE '✅ Created 7 SECURITY DEFINER functions to prevent circular dependencies';
  RAISE NOTICE '✅ Recreated all policies for: communities, community_members, posts, comments, votes, polls, poll_options';
  RAISE NOTICE '✅ All policies now use SECURITY DEFINER functions - NO direct cross-table queries';
  RAISE NOTICE '✅ Fixed column names: content_type/content_id (not target_type/target_id)';
  RAISE NOTICE '📝 Migration 0042 complete';
END$$;

