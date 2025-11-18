-- ============================================
-- GRANULAR NOTIFICATION PREFERENCES
-- Version: 0138
-- Description: Add mentions, moderation actions, email digest, and quiet hours preferences
-- Date: 2025-01-30
-- ============================================

SET search_path TO public;

-- ============================================
-- ADD NEW PREFERENCE COLUMNS
-- ============================================

-- Add mentions preference for @mention notifications
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS mentions BOOLEAN DEFAULT TRUE;

-- Add moderation_actions preference for moderation notifications
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS moderation_actions BOOLEAN DEFAULT TRUE;

-- Verify booking_requests exists (it should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' 
    AND column_name = 'booking_requests'
  ) THEN
    ALTER TABLE notification_preferences 
    ADD COLUMN booking_requests BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add email digest preferences
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_digest_frequency TEXT DEFAULT 'never' CHECK (email_digest_frequency IN ('daily', 'weekly', 'never'));

-- Add quiet hours preferences
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS quiet_hours_timezone TEXT DEFAULT 'UTC';

-- ============================================
-- UPDATE SHOULD_SEND_NOTIFICATION FUNCTION
-- ============================================

-- Update should_send_notification function to check quiet hours and handle new notification types
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_prefs notification_preferences%ROWTYPE;
  v_current_time TIME;
  v_start_time TIME;
  v_end_time TIME;
  v_in_quiet_hours BOOLEAN := FALSE;
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

  -- Check if quiet hours are enabled and if we're currently in quiet hours
  IF v_prefs.quiet_hours_enabled THEN
    -- Get current time in user's timezone
    v_current_time := (NOW() AT TIME ZONE v_prefs.quiet_hours_timezone)::TIME;
    v_start_time := v_prefs.quiet_hours_start;
    v_end_time := v_prefs.quiet_hours_end;

    -- Handle quiet hours that span midnight (e.g., 22:00 to 08:00)
    IF v_start_time > v_end_time THEN
      -- Quiet hours span midnight
      v_in_quiet_hours := v_current_time >= v_start_time OR v_current_time < v_end_time;
    ELSE
      -- Quiet hours within same day
      v_in_quiet_hours := v_current_time >= v_start_time AND v_current_time < v_end_time;
    END IF;

    -- If in quiet hours, don't send notification (except for critical types)
    -- Event reminders and subscription reminders are allowed during quiet hours
    IF v_in_quiet_hours AND p_notification_type NOT IN ('event_reminder', 'subscription_reminder', 'subscription_update', 'subscription_expired') THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check specific preference based on notification type
  RETURN CASE p_notification_type
    WHEN 'comment_on_post' THEN v_prefs.comments_on_post
    WHEN 'comment_reply' THEN v_prefs.comment_replies
    WHEN 'post_upvote' THEN v_prefs.post_votes
    WHEN 'poll_upvote' THEN v_prefs.poll_votes
    WHEN 'comment_upvote' THEN v_prefs.comment_votes
    WHEN 'booking_update' THEN v_prefs.bookings
    WHEN 'booking_request' THEN COALESCE(v_prefs.booking_requests, v_prefs.bookings, TRUE)
    WHEN 'community_invite' THEN v_prefs.community_invites
    WHEN 'artist_response' THEN v_prefs.artist_responses
    WHEN 'event_reminder' THEN v_prefs.event_reminders
    WHEN 'community_role_change' THEN COALESCE(v_prefs.community_role_changes, TRUE)
    WHEN 'direct_message' THEN v_prefs.direct_messages
    WHEN 'booking_message' THEN v_prefs.booking_messages
    WHEN 'mention' THEN v_prefs.mentions
    WHEN 'moderation_action' THEN v_prefs.moderation_actions
    WHEN 'content_reported' THEN v_prefs.moderation_actions
    ELSE TRUE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN notification_preferences.mentions IS 'User preference for @mention notifications';
COMMENT ON COLUMN notification_preferences.moderation_actions IS 'User preference for moderation action notifications';
COMMENT ON COLUMN notification_preferences.booking_requests IS 'User preference for booking request notifications';
COMMENT ON COLUMN notification_preferences.email_digest_enabled IS 'Whether email digest is enabled for the user';
COMMENT ON COLUMN notification_preferences.email_digest_frequency IS 'Frequency of email digest: daily, weekly, or never';
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'Whether quiet hours are enabled';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Start time for quiet hours (24-hour format)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'End time for quiet hours (24-hour format)';
COMMENT ON COLUMN notification_preferences.quiet_hours_timezone IS 'Timezone for quiet hours (e.g., UTC, America/New_York)';
COMMENT ON FUNCTION should_send_notification IS 'Updated to check quiet hours and handle mentions, moderation actions, and booking requests';

