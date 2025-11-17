-- ============================================
-- STANDARDIZE NOTIFICATION CREATION
-- Version: 0104
-- Description: Create database triggers for vote notifications to standardize creation
-- Date: 2025-01-29
-- ============================================

SET search_path TO public;

-- ============================================
-- NOTIFY POST UPVOTE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION notify_post_upvote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post RECORD;
  v_voter_handle TEXT;
BEGIN
  -- Only process upvotes (not downvotes or deletions)
  IF NEW.vote_type != 'upvote' OR TG_OP = 'DELETE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get post details
  SELECT p.*, u.anonymous_handle as author_handle
  INTO v_post
  FROM posts p
  JOIN users u ON p.author_id = u.id
  WHERE p.id = NEW.content_id;

  -- Get voter handle
  SELECT anonymous_handle INTO v_voter_handle
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification for post author if it's an upvote and not their own post
  IF v_post.author_id != NEW.user_id AND v_post IS NOT NULL AND v_voter_handle IS NOT NULL THEN
    PERFORM create_notification(
      v_post.author_id,
      'post_upvote',
      'Your post was upvoted',
      v_voter_handle || ' upvoted your post "' || LEFT(v_post.title, 50) || 
        CASE WHEN LENGTH(v_post.title) > 50 THEN '...' ELSE '' END || '"',
      '/posts/' || NEW.content_id,
      NEW.user_id,
      NEW.content_id,
      'post'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- NOTIFY POLL UPVOTE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION notify_poll_upvote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll RECORD;
  v_voter_handle TEXT;
BEGIN
  -- Only process upvotes (not downvotes or deletions)
  IF NEW.vote_type != 'upvote' OR TG_OP = 'DELETE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get poll details
  SELECT p.*, u.anonymous_handle as author_handle
  INTO v_poll
  FROM polls p
  JOIN users u ON p.author_id = u.id
  WHERE p.id = NEW.content_id;

  -- Get voter handle
  SELECT anonymous_handle INTO v_voter_handle
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification for poll author if it's an upvote and not their own poll
  IF v_poll.author_id != NEW.user_id AND v_poll IS NOT NULL AND v_voter_handle IS NOT NULL THEN
    PERFORM create_notification(
      v_poll.author_id,
      'poll_upvote',
      'Your poll was upvoted',
      v_voter_handle || ' upvoted your poll "' || LEFT(v_poll.question, 50) || 
        CASE WHEN LENGTH(v_poll.question) > 50 THEN '...' ELSE '' END || '"',
      '/polls/' || NEW.content_id,
      NEW.user_id,
      NEW.content_id,
      'poll'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- NOTIFY COMMENT UPVOTE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION notify_comment_upvote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment RECORD;
  v_voter_handle TEXT;
BEGIN
  -- Only process upvotes (not downvotes or deletions)
  IF NEW.vote_type != 'upvote' OR TG_OP = 'DELETE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get comment details
  SELECT c.*, u.anonymous_handle as author_handle
  INTO v_comment
  FROM comments c
  JOIN users u ON c.author_id = u.id
  WHERE c.id = NEW.content_id;

  -- Get voter handle
  SELECT anonymous_handle INTO v_voter_handle
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification for comment author if it's an upvote and not their own comment
  IF v_comment.author_id != NEW.user_id AND v_comment IS NOT NULL AND v_voter_handle IS NOT NULL THEN
    PERFORM create_notification(
      v_comment.author_id,
      'comment_upvote',
      'Your comment was upvoted',
      v_voter_handle || ' upvoted your comment',
      '/posts/' || v_comment.post_id,
      NEW.user_id,
      NEW.content_id,
      'comment'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_post_upvote ON votes;
DROP TRIGGER IF EXISTS trigger_notify_poll_upvote ON votes;
DROP TRIGGER IF EXISTS trigger_notify_comment_upvote ON votes;

-- Trigger for post upvotes
CREATE TRIGGER trigger_notify_post_upvote
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.content_type = 'post' AND NEW.vote_type = 'upvote')
  EXECUTE FUNCTION notify_post_upvote();

-- Trigger for poll upvotes
CREATE TRIGGER trigger_notify_poll_upvote
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.content_type = 'poll' AND NEW.vote_type = 'upvote')
  EXECUTE FUNCTION notify_poll_upvote();

-- Trigger for comment upvotes
CREATE TRIGGER trigger_notify_comment_upvote
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.content_type = 'comment' AND NEW.vote_type = 'upvote')
  EXECUTE FUNCTION notify_comment_upvote();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_post_upvote IS 'Creates notification when a post is upvoted';
COMMENT ON FUNCTION notify_poll_upvote IS 'Creates notification when a poll is upvoted';
COMMENT ON FUNCTION notify_comment_upvote IS 'Creates notification when a comment is upvoted';
COMMENT ON TRIGGER trigger_notify_post_upvote ON votes IS 'Triggers notification creation for post upvotes';
COMMENT ON TRIGGER trigger_notify_poll_upvote ON votes IS 'Triggers notification creation for poll upvotes';
COMMENT ON TRIGGER trigger_notify_comment_upvote ON votes IS 'Triggers notification creation for comment upvotes';

