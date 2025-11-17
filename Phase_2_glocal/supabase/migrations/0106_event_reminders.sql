-- ============================================
-- EVENT REMINDERS
-- Version: 0106
-- Description: Add functions and triggers for event reminder notifications
-- Date: 2025-01-29
-- ============================================

SET search_path TO public;

-- ============================================
-- FUNCTION TO GET EVENTS NEEDING REMINDERS
-- ============================================

-- Function to get events happening in next 24 hours for users who RSVP'd
CREATE OR REPLACE FUNCTION get_events_needing_reminders()
RETURNS TABLE (
  event_id UUID,
  event_title TEXT,
  event_date TIMESTAMPTZ,
  user_id UUID,
  user_anonymous_handle TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS event_id,
    e.title AS event_title,
    e.event_date,
    er.user_id,
    u.anonymous_handle AS user_anonymous_handle
  FROM events e
  INNER JOIN event_rsvps er ON e.id = er.event_id
  INNER JOIN users u ON er.user_id = u.id
  WHERE 
    -- Event is happening between 23 and 25 hours from now (24 hours ± 1 hour window)
    e.event_date >= NOW() + INTERVAL '23 hours'
    AND e.event_date <= NOW() + INTERVAL '25 hours'
    -- Event hasn't passed
    AND e.event_date > NOW()
    -- User hasn't already received a reminder for this event
    AND NOT EXISTS (
      SELECT 1 
      FROM notifications n
      WHERE n.user_id = er.user_id
        AND n.type = 'event_reminder'
        AND n.entity_id = e.id
        AND n.entity_type = 'event'
        AND n.created_at > NOW() - INTERVAL '2 hours'
    );
END;
$$;

-- ============================================
-- FUNCTION TO SEND EVENT REMINDERS
-- ============================================

-- Function to create event reminder notifications for all users who need them
CREATE OR REPLACE FUNCTION send_event_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_record RECORD;
  v_reminders_sent INTEGER := 0;
  v_when_text TEXT;
  v_event_date TIMESTAMPTZ;
BEGIN
  -- Loop through all events needing reminders
  FOR v_event_record IN 
    SELECT * FROM get_events_needing_reminders()
  LOOP
    v_event_date := v_event_record.event_date;
    
    -- Calculate "when" text (e.g., "tomorrow at 7 PM", "in 24 hours")
    IF v_event_date::DATE = (NOW() + INTERVAL '1 day')::DATE THEN
      v_when_text := 'tomorrow at ' || TO_CHAR(v_event_date, 'HH12:MI AM');
    ELSE
      v_when_text := 'in ' || EXTRACT(EPOCH FROM (v_event_date - NOW()))::INTEGER / 3600 || ' hours';
    END IF;
    
    -- Create notification if user preferences allow it
    PERFORM create_notification(
      v_event_record.user_id,
      'event_reminder',
      'Event reminder',
      v_event_record.event_title || ' is happening ' || v_when_text,
      '/events/' || v_event_record.event_id,
      NULL, -- No actor for event reminders
      v_event_record.event_id,
      'event'
    );
    
    v_reminders_sent := v_reminders_sent + 1;
  END LOOP;
  
  RETURN v_reminders_sent;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_events_needing_reminders IS 'Returns events happening in next 24 hours for users who RSVPd and havent received reminders';
COMMENT ON FUNCTION send_event_reminders IS 'Creates event reminder notifications for all users who need them';

