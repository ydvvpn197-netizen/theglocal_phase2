-- Fix Comment Trigger Function
-- Version: 0011
-- Description: Fix ambiguous column reference in increment_member_comment_count function
-- Date: 2025-10-11

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS increment_member_comment_count_trigger ON comments;
DROP FUNCTION IF EXISTS increment_member_comment_count();

-- Recreate the function with explicit column references
CREATE OR REPLACE FUNCTION increment_member_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_members cm
  SET 
    comment_count = cm.comment_count + 1,
    last_seen_at = NOW()
  FROM posts p
  WHERE p.id = NEW.post_id 
    AND cm.community_id = p.community_id 
    AND cm.user_id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER increment_member_comment_count_trigger 
AFTER INSERT ON comments
FOR EACH ROW 
EXECUTE FUNCTION increment_member_comment_count();

COMMENT ON FUNCTION increment_member_comment_count() IS 'Increments comment count for community members when they create comments';
