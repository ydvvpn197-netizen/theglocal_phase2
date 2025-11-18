-- ============================================
-- ARTIST RESPONSE NOTIFICATIONS
-- Version: 0108
-- Description: Update booking message notifications to use artist_response type when artist responds
-- Date: 2025-01-29
-- ============================================

SET search_path TO public;

-- ============================================
-- UPDATE NOTIFY_BOOKING_MESSAGE FUNCTION
-- ============================================

-- Update function to create artist_response notification when artist sends message
CREATE OR REPLACE FUNCTION notify_booking_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_handle TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_is_artist BOOLEAN;
  v_notification_type TEXT;
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

  -- Determine notification type: artist_response if artist sent, booking_message if customer sent
  IF v_is_artist THEN
    v_notification_type := 'artist_response';
    v_notification_title := 'Freelancer/Creator response';
    v_notification_message := v_sender_handle || ' sent you a message about your booking';
  ELSE
    v_notification_type := 'booking_message';
    v_notification_title := 'New booking message';
    v_notification_message := v_sender_handle || ': ' || LEFT(NEW.message, 100);
  END IF;

  -- Create notification if user preferences allow it
  IF should_send_notification(v_recipient_id, v_notification_type) THEN
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
      v_notification_type,
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
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_booking_message IS 'Creates artist_response notification when artist sends message, booking_message when customer sends';

