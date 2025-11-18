-- ============================================
-- ADD POLL_VOTES PREFERENCE
-- Version: 0103
-- Description: Add poll_votes preference column and update should_send_notification function
-- Date: 2025-01-29
-- ============================================

SET search_path TO public;

-- ============================================
-- ADD POLL_VOTES COLUMN
-- ============================================

-- Add poll_votes column to notification_preferences table
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS poll_votes BOOLEAN DEFAULT TRUE;

-- ============================================
-- UPDATE SHOULD_SEND_NOTIFICATION FUNCTION
-- ============================================

-- Update should_send_notification function to use poll_votes for poll_upvote
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_prefs notification_preferences%ROWTYPE;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences found, create default ones
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;

  -- Check specific notification type
  RETURN CASE p_notification_type
    WHEN 'comment_on_post' THEN v_prefs.comments_on_post
    WHEN 'comment_reply' THEN v_prefs.comment_replies
    WHEN 'post_upvote' THEN v_prefs.post_votes
    WHEN 'poll_upvote' THEN v_prefs.poll_votes
    WHEN 'comment_upvote' THEN v_prefs.comment_votes
    WHEN 'booking_update' THEN v_prefs.bookings
    WHEN 'community_invite' THEN v_prefs.community_invites
    WHEN 'artist_response' THEN v_prefs.artist_responses
    WHEN 'event_reminder' THEN v_prefs.event_reminders
    WHEN 'community_role_change' THEN v_prefs.community_role_changes
    WHEN 'direct_message' THEN v_prefs.direct_messages
    WHEN 'booking_message' THEN v_prefs.booking_messages
    ELSE TRUE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN notification_preferences.poll_votes IS 'User preference for poll upvote notifications';
COMMENT ON FUNCTION should_send_notification IS 'Updated to use poll_votes preference for poll_upvote notifications';

