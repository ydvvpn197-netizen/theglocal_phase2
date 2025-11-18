-- Fix Comment Creation Policy
-- Version: 0010
-- Description: Fix comment creation RLS policy to handle both community membership and ban checks
-- Date: 2025-10-11

-- Drop the problematic comment creation policy
DROP POLICY IF EXISTS "Non-banned users can create comments" ON comments;

-- Create a comprehensive comment creation policy that checks:
-- 1. User is authenticated
-- 2. User is not banned
-- 3. User is a member of the community where the post exists
CREATE POLICY "Authenticated non-banned community members can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    -- Check user is not banned
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = TRUE
      AND (users.ban_expires_at IS NULL OR users.ban_expires_at > NOW())
    ) AND
    -- Check user is a member of the community
    EXISTS (
      SELECT 1 FROM posts
      JOIN community_members cm ON cm.community_id = posts.community_id
      WHERE posts.id = comments.post_id
      AND cm.user_id = auth.uid()
      AND NOT posts.is_deleted
    )
  );

-- Also ensure the posts policy is consistent
DROP POLICY IF EXISTS "Non-banned users can create posts" ON posts;

CREATE POLICY "Authenticated non-banned community members can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    -- Check user is not banned
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = TRUE
      AND (users.ban_expires_at IS NULL OR users.ban_expires_at > NOW())
    ) AND
    -- Check user is a member of the community
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Authenticated non-banned community members can create comments" ON comments IS 
  'Allows authenticated, non-banned users who are community members to create comments';

COMMENT ON POLICY "Authenticated non-banned community members can create posts" ON posts IS 
  'Allows authenticated, non-banned users who are community members to create posts';
