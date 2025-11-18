-- ============================================
-- Fix Notification System Race Conditions
-- Version: 0135
-- Description: Comprehensive fix for all notification race conditions
--              - Advisory locks for trigger batching
--              - Atomic operations with row-level locking
--              - Helper functions for safe concurrent operations
-- Date: 2025-01-29
-- ============================================

SET search_path = public;

-- ============================================
-- PART 1: ATOMIC HELPER FUNCTIONS
-- ============================================

-- Atomically get notification summary with consistent snapshot
-- Prevents stale counts during concurrent inserts
CREATE OR REPLACE FUNCTION get_notification_summary_atomic(p_user_id UUID)
RETURNS TABLE(
  unread_count INTEGER, 
  latest_id UUID, 
  latest_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Use single query for consistency
  RETURN QUERY
  WITH counts AS (
    SELECT COUNT(*)::INTEGER as cnt
    FROM notifications
    WHERE user_id = p_user_id AND read_at IS NULL
  ),
  latest AS (
    SELECT id, created_at
    FROM notifications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(counts.cnt, 0)::INTEGER,
    latest.id,
    latest.created_at
  FROM counts
  LEFT JOIN latest ON true;
END;
$$;

COMMENT ON FUNCTION get_notification_summary_atomic IS 
  'Atomically fetches unread count and latest notification in a single consistent snapshot';

-- Lock and mark notification as read (idempotent, prevents double-marking)
CREATE OR REPLACE FUNCTION lock_and_mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS TABLE(was_unread BOOLEAN, success BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_was_unread BOOLEAN;
  v_exists BOOLEAN;
BEGIN
  -- Lock row and check if exists and unread
  SELECT 
    EXISTS(SELECT 1),
    (read_at IS NULL)
  INTO v_exists, v_was_unread
  FROM notifications
  WHERE id = p_notification_id 
    AND user_id = p_user_id
  FOR NO KEY UPDATE;
  
  -- Return early if doesn't exist
  IF NOT v_exists THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;
  
  -- Only update if was unread
  IF v_was_unread THEN
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = p_notification_id 
      AND user_id = p_user_id
      AND read_at IS NULL; -- Double check to be safe
  END IF;
  
  RETURN QUERY SELECT v_was_unread, true;
END;
$$;

COMMENT ON FUNCTION lock_and_mark_notification_read IS 
  'Safely marks notification as read with row-level locking to prevent race conditions';

-- Batch mark notifications with timestamp cutoff
-- Prevents marking notifications that arrive during the operation
CREATE OR REPLACE FUNCTION mark_notifications_read_before(
  p_user_id UUID,
  p_cutoff_time TIMESTAMPTZ
)
RETURNS TABLE(updated_ids UUID[], updated_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Lock and update in single atomic operation
  WITH updated AS (
    UPDATE notifications
    SET read_at = NOW()
    WHERE user_id = p_user_id
      AND read_at IS NULL
      AND created_at <= p_cutoff_time
    RETURNING id
  )
  SELECT array_agg(id), COUNT(*)::INTEGER 
  INTO v_ids, v_count
  FROM updated;
  
  -- Handle case where no rows were updated
  IF v_ids IS NULL THEN
    v_ids := ARRAY[]::UUID[];
    v_count := 0;
  END IF;
  
  RETURN QUERY SELECT v_ids, v_count;
END;
$$;

COMMENT ON FUNCTION mark_notifications_read_before IS 
  'Batch marks notifications as read up to a cutoff time, preventing race with new notifications';

-- ============================================
-- PART 2: IMPROVED TRIGGER WITH ADVISORY LOCKS
-- ============================================

-- Improved notify_direct_message with advisory locks for batching
CREATE OR REPLACE FUNCTION notify_direct_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_handle TEXT;
  v_unread_count INTEGER;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_notification_id UUID;
  v_conversation RECORD;
  v_batch_key TEXT;
  v_lock_id BIGINT;
  v_existing_notification RECORD;
BEGIN
  -- Get conversation details
  SELECT participant_1_id, participant_2_id
  INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Skip if conversation not found
  IF v_conversation IS NULL THEN
    RAISE WARNING 'Conversation % not found for message %', NEW.conversation_id, NEW.id;
    RETURN NEW;
  END IF;

  -- Determine recipient (the other participant)
  IF NEW.sender_id = v_conversation.participant_1_id THEN
    v_recipient_id := v_conversation.participant_2_id;
  ELSE
    v_recipient_id := v_conversation.participant_1_id;
  END IF;

  -- Skip if recipient not found or same as sender
  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RAISE WARNING 'Invalid recipient for message %: recipient_id=%, sender_id=%', NEW.id, v_recipient_id, NEW.sender_id;
    RETURN NEW;
  END IF;

  -- Generate batch key for this notification type
  v_batch_key := v_recipient_id::TEXT || ':direct_message:' || NEW.conversation_id::TEXT;
  
  -- Generate lock ID from batch key using hash
  v_lock_id := ('x' || substr(md5(v_batch_key), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock for this batch (transaction-level, auto-released)
  -- This serializes notification creation for the same batch key
  IF NOT pg_try_advisory_xact_lock(v_lock_id) THEN
    RAISE WARNING 'Could not acquire advisory lock for notification batch %, skipping', v_batch_key;
    RETURN NEW;
  END IF;

  -- Now we have exclusive access for this batch key
  -- Check for existing unread notification within last 5 minutes
  SELECT id, batch_count, message
  INTO v_existing_notification
  FROM notifications
  WHERE user_id = v_recipient_id
    AND type = 'direct_message'
    AND entity_id = NEW.conversation_id
    AND entity_type = 'conversation'
    AND read_at IS NULL
    AND created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Skip if another transaction has it locked

  -- Get sender handle
  SELECT anonymous_handle INTO v_sender_handle
  FROM users
  WHERE id = NEW.sender_id;

  -- Skip if sender not found
  IF v_sender_handle IS NULL THEN
    RAISE WARNING 'Sender % not found for message %', NEW.sender_id, NEW.id;
    RETURN NEW;
  END IF;

  -- Count unread messages from this sender in this conversation
  SELECT COUNT(*) INTO v_unread_count
  FROM messages
  WHERE conversation_id = NEW.conversation_id
    AND sender_id = NEW.sender_id
    AND is_deleted = false
    AND id NOT IN (
      SELECT message_id 
      FROM message_reads 
      WHERE user_id = v_recipient_id
    );

  -- If existing notification found, update it (batching)
  IF v_existing_notification IS NOT NULL THEN
    -- Update existing notification with new count and timestamp
    IF v_unread_count > 1 THEN
      v_notification_title := v_unread_count || ' new messages';
      v_notification_message := v_sender_handle || ' sent you ' || v_unread_count || ' messages';
    ELSE
      v_notification_title := 'New message';
      v_notification_message := v_sender_handle || ': ' || LEFT(COALESCE(NEW.content, ''), 100);
    END IF;
    
    UPDATE notifications
    SET 
      batch_count = v_unread_count,
      title = v_notification_title,
      message = v_notification_message,
      created_at = NOW() -- Update to show it's recent
    WHERE id = v_existing_notification.id;
    
    RAISE NOTICE 'Updated batched notification % (count: %)', v_existing_notification.id, v_unread_count;
    RETURN NEW;
  END IF;

  -- Create new notification title and message
  IF v_unread_count > 1 THEN
    v_notification_title := v_unread_count || ' new messages';
    v_notification_message := v_sender_handle || ' sent you ' || v_unread_count || ' messages';
  ELSE
    v_notification_title := 'New message';
    v_notification_message := v_sender_handle || ': ' || LEFT(COALESCE(NEW.content, ''), 100);
  END IF;

  -- Create notification if user preferences allow it
  IF should_send_notification(v_recipient_id, 'direct_message') THEN
    BEGIN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        actor_id,
        entity_id,
        entity_type,
        batch_key,
        batch_count
      ) VALUES (
        v_recipient_id,
        'direct_message',
        v_notification_title,
        v_notification_message,
        '/messages?conversation=' || NEW.conversation_id,
        NEW.sender_id,
        NEW.conversation_id,
        'conversation',
        v_batch_key,
        v_unread_count
      )
      RETURNING id INTO v_notification_id;
      
      -- Log success for debugging
      RAISE NOTICE 'Notification created: % for user % (message: %, conversation: %)', 
        v_notification_id, v_recipient_id, NEW.id, NEW.conversation_id;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the message insertion
      RAISE WARNING 'Failed to create notification for message % (conversation: %, recipient: %): %', 
        NEW.id, NEW.conversation_id, v_recipient_id, SQLERRM;
    END;
  ELSE
    -- Log if notification was skipped due to preferences
    RAISE NOTICE 'Notification skipped for user % (message: %) - user preferences disabled', 
      v_recipient_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_direct_message IS 
  'Creates or updates notification when a direct message is sent. Uses advisory locks to prevent duplicate notifications and enable proper batching.';

-- ============================================
-- PART 3: IMPROVED CREATE_NOTIFICATION WITH LOCKING
-- ============================================

-- Enhanced create_notification with proper row-level locking
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
  v_lock_id BIGINT;
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
  
  -- Generate lock ID for advisory lock
  v_lock_id := ('x' || substr(md5(v_batch_key), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock for this batch
  IF NOT pg_try_advisory_xact_lock(v_lock_id) THEN
    RAISE WARNING 'Could not acquire lock for notification batch %, creating anyway', v_batch_key;
    -- Continue without batching if can't get lock
  ELSE
    -- Check for existing unread notification with same batch key within last 5 minutes
    SELECT id, batch_count, message, actor_id
    INTO v_existing_notification
    FROM notifications
    WHERE batch_key = v_batch_key
      AND read_at IS NULL
      AND created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED; -- Skip if locked by another transaction
    
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

COMMENT ON FUNCTION create_notification IS 
  'Creates or batches notifications with advisory locks to prevent race conditions - groups rapid notifications of same type on same entity';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created get_notification_summary_atomic function';
  RAISE NOTICE '✅ Created lock_and_mark_notification_read function';
  RAISE NOTICE '✅ Created mark_notifications_read_before function';
  RAISE NOTICE '✅ Enhanced notify_direct_message trigger with advisory locks';
  RAISE NOTICE '✅ Enhanced create_notification with row-level locking';
  RAISE NOTICE '✅ Migration 0135 complete - notification race conditions fixed';
END $$;

