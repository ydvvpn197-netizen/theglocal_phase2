-- Add community role change notification preference
-- Version: 0058
-- Description: Add preference for community role change notifications
-- Date: 2025-10-18

-- Add new column to notification_preferences
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS community_role_changes BOOLEAN DEFAULT TRUE;

-- Update existing users to have this preference enabled
UPDATE notification_preferences 
SET community_role_changes = TRUE 
WHERE community_role_changes IS NULL;

-- Update the should_send_notification function to handle the new type
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  -- Get user preferences, default to TRUE if not set
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, default to sending notifications
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific preference based on notification type
  RETURN CASE p_notification_type
    WHEN 'comment_on_post' THEN v_prefs.comments_on_post
    WHEN 'comment_reply' THEN v_prefs.comment_replies
    WHEN 'post_upvote' THEN v_prefs.post_votes
    WHEN 'comment_upvote' THEN v_prefs.comment_votes
    WHEN 'booking_update' THEN v_prefs.bookings
    WHEN 'community_invite' THEN v_prefs.community_invites
    WHEN 'artist_response' THEN v_prefs.artist_responses
    WHEN 'event_reminder' THEN v_prefs.event_reminders
    WHEN 'community_role_change' THEN v_prefs.community_role_changes
    ELSE TRUE
  END;
END;
$$;

COMMENT ON COLUMN notification_preferences.community_role_changes IS 
  'Receive notifications when your role changes in a community';

