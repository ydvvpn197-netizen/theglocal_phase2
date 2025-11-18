-- Migration: Allow moderators to delete comments
-- Description: Enable admins and moderators to delete any user's comments in their communities
-- This matches the existing permissions for post deletion

-- Drop the existing policy
DROP POLICY IF EXISTS "Authors can delete own comments" ON comments;

-- Recreate policy for authors to delete their own comments
CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = author_id);

-- Add new policy for admins/moderators to delete comments in their communities
-- Since comments don't have community_id directly, we join through posts
CREATE POLICY "Admins can delete comments"
  ON comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND (
        is_community_creator_safe(posts.community_id, auth.uid()) OR
        is_community_admin_safe(posts.community_id, auth.uid())
      )
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Admins can delete comments" ON comments IS 
  'Allows community admins and moderators to delete any comment on posts in their community';

