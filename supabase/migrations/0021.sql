-- Migration: Add functions to fetch user votes alongside posts and comments
-- This enables the UI to show which posts/comments the user has voted on

-- Function to get user's vote on a specific post
CREATE OR REPLACE FUNCTION get_user_post_vote(post_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
  SELECT vote_type
  FROM votes
  WHERE content_type = 'post'
    AND content_id = post_uuid
    AND user_id = user_uuid
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get user's vote on a specific comment
CREATE OR REPLACE FUNCTION get_user_comment_vote(comment_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
  SELECT vote_type
  FROM votes
  WHERE content_type = 'comment'
    AND content_id = comment_uuid
    AND user_id = user_uuid
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_post_vote IS 'Returns the vote type (upvote/downvote) for a user on a specific post';
COMMENT ON FUNCTION get_user_comment_vote IS 'Returns the vote type (upvote/downvote) for a user on a specific comment';

