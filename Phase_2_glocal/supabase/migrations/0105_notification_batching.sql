-- ============================================
-- NOTIFICATION BATCHING
-- Version: 0105
-- Description: Add batching support to group rapid notifications
-- Date: 2025-01-29
-- ============================================

SET search_path TO public;

-- ============================================
-- ADD BATCHING COLUMNS
-- ============================================

-- Add batch_key and batch_count columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS batch_key TEXT,
ADD COLUMN IF NOT EXISTS batch_count INTEGER DEFAULT 1;

-- Create index for efficient batch lookups
CREATE INDEX IF NOT EXISTS idx_notifications_batch_key 
ON notifications(batch_key, created_at) 
WHERE batch_key IS NOT NULL AND read_at IS NULL;

-- ============================================
-- UPDATE CREATE_NOTIFICATION FUNCTION
-- ============================================

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
  v_batch_key TEXT;
  v_existing_notification RECORD;
  v_batch_count INTEGER;
  v_updated_message TEXT;
  v_actor_handle TEXT;
  v_entity_title TEXT;
BEGIN
  -- Check if user should receive this notification
  IF NOT should_send_notification(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;
  
  -- Don't notify users about their own actions
  IF p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;
  
  -- Generate batch key for batching similar notifications
  -- Format: user_id:type:entity_id (batches notifications from different actors on same entity)
  v_batch_key := p_user_id::TEXT || ':' || p_type || ':' || COALESCE(p_entity_id::TEXT, '');
  
  -- Check for existing unread notification with same batch key within last 5 minutes
  SELECT id, batch_count, message, actor_id
  INTO v_existing_notification
  FROM notifications
  WHERE batch_key = v_batch_key
    AND read_at IS NULL
    AND created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If existing notification found, update it instead of creating new one
  IF v_existing_notification IS NOT NULL THEN
    v_batch_count := v_existing_notification.batch_count + 1;
    
    -- Get actor handle for updated message
    SELECT anonymous_handle INTO v_actor_handle
    FROM users
    WHERE id = p_actor_id;
    
    -- Generate updated message based on notification type
    IF p_type IN ('post_upvote', 'poll_upvote', 'comment_upvote') THEN
      -- For votes, show "X users upvoted..."
      v_updated_message := v_batch_count || ' users upvoted your ' || 
        CASE 
          WHEN p_type = 'post_upvote' THEN 'post'
          WHEN p_type = 'poll_upvote' THEN 'poll'
          WHEN p_type = 'comment_upvote' THEN 'comment'
        END;
      
      -- Try to get entity title for context
      IF p_type = 'post_upvote' AND p_entity_id IS NOT NULL THEN
        SELECT title INTO v_entity_title FROM posts WHERE id = p_entity_id;
        IF v_entity_title IS NOT NULL THEN
          v_updated_message := v_updated_message || ' "' || LEFT(v_entity_title, 50) || 
            CASE WHEN LENGTH(v_entity_title) > 50 THEN '...' ELSE '' END || '"';
        END IF;
      ELSIF p_type = 'poll_upvote' AND p_entity_id IS NOT NULL THEN
        SELECT question INTO v_entity_title FROM polls WHERE id = p_entity_id;
        IF v_entity_title IS NOT NULL THEN
          v_updated_message := v_updated_message || ' "' || LEFT(v_entity_title, 50) || 
            CASE WHEN LENGTH(v_entity_title) > 50 THEN '...' ELSE '' END || '"';
        END IF;
      END IF;
    ELSE
      -- For other types, show count
      v_updated_message := v_batch_count || ' new ' || p_type || ' notifications';
    END IF;
    
    -- Update existing notification
    UPDATE notifications
    SET 
      batch_count = v_batch_count,
      message = v_updated_message,
      title = CASE 
        WHEN p_type IN ('post_upvote', 'poll_upvote', 'comment_upvote') THEN
          v_batch_count || ' users upvoted your ' || 
          CASE 
            WHEN p_type = 'post_upvote' THEN 'post'
            WHEN p_type = 'poll_upvote' THEN 'poll'
            WHEN p_type = 'comment_upvote' THEN 'comment'
          END
        ELSE p_title
      END,
      created_at = NOW() -- Update timestamp to show it's recent
    WHERE id = v_existing_notification.id;
    
    RETURN v_existing_notification.id;
  END IF;
  
  -- No existing notification found, create new one
  INSERT INTO notifications (
    user_id, type, title, message, link, actor_id, entity_id, entity_type, batch_key, batch_count
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_link, p_actor_id, p_entity_id, p_entity_type, v_batch_key, 1
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN notifications.batch_key IS 'Key for batching similar notifications together';
COMMENT ON COLUMN notifications.batch_count IS 'Number of notifications batched together';
COMMENT ON FUNCTION create_notification IS 'Creates or batches notifications - groups rapid notifications of same type on same entity';

