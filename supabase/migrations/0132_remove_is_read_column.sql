-- ============================================
-- Remove is_read column from notifications
-- Version: 0132
-- Description: Drop is_read column and update indexes/functions to use read_at
-- Date: 2025-11-12
-- ============================================

SET search_path TO public;

-- ============================================
-- Drop old indexes that reference is_read
-- ============================================

DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_notifications_batch_key;

-- ============================================
-- Drop is_read column from notifications
-- ============================================

ALTER TABLE notifications DROP COLUMN IF EXISTS is_read;

-- ============================================
-- Recreate indexes using read_at
-- ============================================

-- Index on read_at for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- Index for unread notifications (read_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Performance index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Batch key index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_batch_key 
ON notifications(batch_key, created_at) 
WHERE batch_key IS NOT NULL AND read_at IS NULL;

-- ============================================
-- Update create_notification function to use read_at
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
  v_requestor UUID := auth.uid();
  v_request_role TEXT := COALESCE((current_setting('request.jwt.claims', true)::jsonb)->>'role', '');
BEGIN
  -- Ensure authenticated callers can only act on their own behalf
  IF v_requestor IS NOT NULL AND v_request_role <> 'service_role' THEN
    IF p_actor_id IS NOT NULL THEN
      IF v_requestor <> p_actor_id THEN
        RAISE EXCEPTION 'Actor mismatch: caller cannot create notifications for another actor';
      END IF;
    ELSE
      IF v_requestor <> p_user_id THEN
        RAISE EXCEPTION 'Caller cannot create notifications for other users without an actor context';
      END IF;
    END IF;
  END IF;

  -- Respect user notification preferences
  IF NOT should_send_notification(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;

  -- Skip self-notifications
  IF p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;

  -- Generate batch key for rapid, similar notifications
  v_batch_key := p_user_id::TEXT || ':' || p_type || ':' || COALESCE(p_entity_id::TEXT, '');

  -- Attempt to merge with an existing unread notification in the same batch window
  SELECT id, batch_count, message, actor_id
  INTO v_existing_notification
  FROM notifications
  WHERE batch_key = v_batch_key
    AND read_at IS NULL
    AND created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_notification IS NOT NULL THEN
    v_batch_count := v_existing_notification.batch_count + 1;

    SELECT anonymous_handle INTO v_actor_handle
    FROM users
    WHERE id = p_actor_id;

    IF p_type IN ('post_upvote', 'poll_upvote', 'comment_upvote') THEN
      v_updated_message := v_batch_count || ' users upvoted your ' ||
        CASE
          WHEN p_type = 'post_upvote' THEN 'post'
          WHEN p_type = 'poll_upvote' THEN 'poll'
          WHEN p_type = 'comment_upvote' THEN 'comment'
        END;

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
      v_updated_message := v_batch_count || ' new ' || p_type || ' notifications';
    END IF;

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
      created_at = NOW()
    WHERE id = v_existing_notification.id;

    RETURN v_existing_notification.id;
  END IF;

  INSERT INTO notifications (
    user_id, type, title, message, link, actor_id, entity_id, entity_type, batch_key, batch_count
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_link, p_actor_id, p_entity_id, p_entity_type, v_batch_key, 1
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Restrict direct execution of create_notification to trusted roles
REVOKE EXECUTE ON FUNCTION create_notification(
  UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_notification(
  UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT
) TO service_role;

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dropped is_read column from notifications';
  RAISE NOTICE '✅ Updated indexes to use read_at IS NULL';
  RAISE NOTICE '✅ Updated create_notification function to use read_at';
  RAISE NOTICE '📝 Migration 0132 complete - is_read column removed';
END$$;

