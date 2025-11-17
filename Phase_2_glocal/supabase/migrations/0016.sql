-- Notifications System Migration
-- Version: 0016
-- Description: Real-time notification system with preferences
-- Date: 2025-10-12

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_id UUID,
  entity_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  comments_on_post BOOLEAN DEFAULT TRUE,
  comment_replies BOOLEAN DEFAULT TRUE,
  post_votes BOOLEAN DEFAULT FALSE,
  comment_votes BOOLEAN DEFAULT FALSE,
  bookings BOOLEAN DEFAULT TRUE,
  community_invites BOOLEAN DEFAULT TRUE,
  artist_responses BOOLEAN DEFAULT TRUE,
  event_reminders BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);

-- ============================================
-- RLS POLICIES - NOTIFICATIONS
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - NOTIFICATION PREFERENCES
-- ============================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user should receive notification
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
    ELSE TRUE
  END;
END;
$$;

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Check if user should receive this notification
  IF NOT should_send_notification(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;
  
  -- Don't notify users about their own actions
  IF p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;
  
  -- Insert notification
  INSERT INTO notifications (
    user_id, type, title, message, link, actor_id, entity_id, entity_type
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_link, p_actor_id, p_entity_id, p_entity_type
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================
-- TRIGGERS FOR AUTO-NOTIFICATIONS
-- ============================================

-- Trigger: Notify post author when someone comments
CREATE OR REPLACE FUNCTION notify_comment_on_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post RECORD;
  v_actor_handle TEXT;
BEGIN
  -- Get post details
  SELECT p.*, u.anonymous_handle as author_handle
  INTO v_post
  FROM posts p
  JOIN users u ON p.author_id = u.id
  WHERE p.id = NEW.post_id;
  
  -- Get commenter handle
  SELECT anonymous_handle INTO v_actor_handle
  FROM users
  WHERE id = NEW.author_id;
  
  -- Create notification for post author
  IF v_post.author_id != NEW.author_id THEN
    PERFORM create_notification(
      v_post.author_id,
      'comment_on_post',
      'New comment on your post',
      v_actor_handle || ' commented on "' || LEFT(v_post.title, 50) || '"',
      '/posts/' || NEW.post_id,
      NEW.author_id,
      NEW.id,
      'comment'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_comment_on_post
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_on_post();

-- Trigger: Notify parent comment author when someone replies
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_comment RECORD;
  v_actor_handle TEXT;
BEGIN
  -- Only proceed if this is a reply
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get parent comment details
  SELECT c.*, u.anonymous_handle as author_handle
  INTO v_parent_comment
  FROM comments c
  JOIN users u ON c.author_id = u.id
  WHERE c.id = NEW.parent_comment_id;
  
  -- Get replier handle
  SELECT anonymous_handle INTO v_actor_handle
  FROM users
  WHERE id = NEW.author_id;
  
  -- Create notification for parent comment author
  IF v_parent_comment.author_id != NEW.author_id THEN
    PERFORM create_notification(
      v_parent_comment.author_id,
      'comment_reply',
      'Reply to your comment',
      v_actor_handle || ' replied to your comment',
      '/posts/' || NEW.post_id,
      NEW.author_id,
      NEW.id,
      'comment'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_comment_reply
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_reply();

-- Trigger: Notify on booking status changes
CREATE OR REPLACE FUNCTION notify_booking_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_artist_name TEXT;
  v_status_text TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get artist name
  SELECT name INTO v_artist_name
  FROM artists
  WHERE id = NEW.artist_id;
  
  -- Set status text
  v_status_text := CASE NEW.status
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'declined' THEN 'declined'
    WHEN 'completed' THEN 'marked as completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE NEW.status
  END;
  
  -- Notify the user who made the booking
  PERFORM create_notification(
    NEW.user_id,
    'booking_update',
    'Booking status updated',
    'Your booking with ' || v_artist_name || ' has been ' || v_status_text,
    '/bookings/' || NEW.id,
    NULL,
    NEW.id,
    'booking'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_booking_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_update();

-- Trigger: Auto-delete expired notifications
CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < NOW();
END;
$$;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE notifications IS 'Stores user notifications with 30-day auto-expiration';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types';
COMMENT ON FUNCTION create_notification IS 'Creates a notification if user preferences allow it';
COMMENT ON FUNCTION should_send_notification IS 'Checks if user should receive a specific notification type';




