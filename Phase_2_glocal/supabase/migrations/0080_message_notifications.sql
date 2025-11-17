-- ============================================
-- MESSAGE NOTIFICATIONS MIGRATION
-- Version: 0080
-- Description: Add notification support for direct messages and booking messages
-- Date: 2025-01-27
-- ============================================

-- ============================================
-- ADD NEW PREFERENCE COLUMNS
-- ============================================

-- Add new notification preference columns
ALTER TABLE notification_preferences 
ADD COLUMN direct_messages BOOLEAN DEFAULT TRUE,
ADD COLUMN booking_messages BOOLEAN DEFAULT TRUE;

-- ============================================
-- UPDATE NOTIFICATION FUNCTIONS
-- ============================================

-- Update should_send_notification function to handle new message types
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
    WHEN 'poll_upvote' THEN v_prefs.post_votes
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
-- MESSAGE NOTIFICATION FUNCTIONS
-- ============================================

-- Function to create notification for direct messages
CREATE OR REPLACE FUNCTION notify_direct_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_handle TEXT;
  v_unread_count INTEGER;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Determine recipient (the other participant)
  IF NEW.sender_id = (SELECT participant_1_id FROM conversations WHERE id = NEW.conversation_id) THEN
    v_recipient_id := (SELECT participant_2_id FROM conversations WHERE id = NEW.conversation_id);
  ELSE
    v_recipient_id := (SELECT participant_1_id FROM conversations WHERE id = NEW.conversation_id);
  END IF;

  -- Get sender handle
  SELECT anonymous_handle INTO v_sender_handle
  FROM users
  WHERE id = NEW.sender_id;

  -- Count unread messages from this sender in this conversation
  SELECT COUNT(*) INTO v_unread_count
  FROM messages
  WHERE conversation_id = NEW.conversation_id
    AND sender_id = NEW.sender_id
    AND id NOT IN (
      SELECT message_id 
      FROM message_reads 
      WHERE user_id = v_recipient_id
    );

  -- Create notification title and message
  IF v_unread_count > 1 THEN
    v_notification_title := v_unread_count || ' new messages';
    v_notification_message := v_sender_handle || ' sent you ' || v_unread_count || ' messages';
  ELSE
    v_notification_title := 'New message';
    v_notification_message := v_sender_handle || ': ' || LEFT(NEW.content, 100);
  END IF;

  -- Create notification if user preferences allow it
  IF should_send_notification(v_recipient_id, 'direct_message') THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      actor_id,
      entity_id,
      entity_type
    ) VALUES (
      v_recipient_id,
      'direct_message',
      v_notification_title,
      v_notification_message,
      '/messages?conversation=' || NEW.conversation_id,
      NEW.sender_id,
      NEW.conversation_id,
      'conversation'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for booking messages
CREATE OR REPLACE FUNCTION notify_booking_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_handle TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_is_artist BOOLEAN;
BEGIN
  -- Determine recipient and if sender is artist
  SELECT 
    CASE 
      WHEN NEW.sender_id = user_id THEN artist_id
      ELSE user_id
    END,
    CASE 
      WHEN NEW.sender_id = artist_id THEN TRUE
      ELSE FALSE
    END
  INTO v_recipient_id, v_is_artist
  FROM bookings
  WHERE id = NEW.booking_id;

  -- Get sender handle
  SELECT anonymous_handle INTO v_sender_handle
  FROM users
  WHERE id = NEW.sender_id;

  -- Create notification title and message
  -- Note: booking_messages don't have read tracking, so we always show "New booking message"
  v_notification_title := 'New booking message';
  v_notification_message := v_sender_handle || ': ' || LEFT(NEW.message, 100);

  -- Create notification if user preferences allow it
  IF should_send_notification(v_recipient_id, 'booking_message') THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      actor_id,
      entity_id,
      entity_type
    ) VALUES (
      v_recipient_id,
      'booking_message',
      v_notification_title,
      v_notification_message,
      '/bookings/' || NEW.booking_id,
      NEW.sender_id,
      NEW.booking_id,
      'booking'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Trigger for direct messages
CREATE TRIGGER trigger_notify_direct_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_direct_message();

-- Trigger for booking messages
CREATE TRIGGER trigger_notify_booking_message
  AFTER INSERT ON booking_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_message();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_direct_message IS 'Creates notification when a direct message is sent';
COMMENT ON FUNCTION notify_booking_message IS 'Creates notification when a booking message is sent';
COMMENT ON TRIGGER trigger_notify_direct_message ON messages IS 'Triggers notification creation for direct messages';
COMMENT ON TRIGGER trigger_notify_booking_message ON booking_messages IS 'Triggers notification creation for booking messages';
