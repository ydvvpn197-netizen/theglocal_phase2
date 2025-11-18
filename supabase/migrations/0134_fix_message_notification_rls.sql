-- ============================================
-- Fix Message Notification RLS and Trigger
-- Version: 0134
-- Description: Fix RLS policy to allow SECURITY DEFINER triggers to insert notifications
--              Improve error handling in notify_direct_message trigger
-- Date: 2025-01-27
-- ============================================

SET search_path = public;

-- ============================================
-- FIX RLS POLICY FOR NOTIFICATIONS
-- ============================================

-- Drop the restrictive policy that blocks SECURITY DEFINER functions
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create a new policy that allows SECURITY DEFINER functions to insert
-- SECURITY DEFINER functions run with elevated privileges and can bypass RLS
-- We check that user_id is not null as basic validation
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Allow if user_id is not null (basic validation)
    user_id IS NOT NULL
    -- Note: SECURITY DEFINER functions can insert, RLS will check other policies for SELECT/UPDATE/DELETE
  );

COMMENT ON POLICY "System can insert notifications" ON notifications IS 
  'Allows SECURITY DEFINER triggers and functions to insert notifications. RLS still applies to SELECT/UPDATE/DELETE operations.';

-- ============================================
-- IMPROVE NOTIFY_DIRECT_MESSAGE TRIGGER
-- ============================================

-- Recreate the trigger function with better error handling
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

  -- Create notification title and message
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

-- ============================================
-- VERIFY TRIGGER EXISTS
-- ============================================

-- Ensure the trigger exists (it should already exist from migration 0080)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_notify_direct_message'
  ) THEN
    CREATE TRIGGER trigger_notify_direct_message
      AFTER INSERT ON messages
      FOR EACH ROW
      EXECUTE FUNCTION notify_direct_message();
    
    RAISE NOTICE 'Created trigger_notify_direct_message';
  ELSE
    RAISE NOTICE 'Trigger trigger_notify_direct_message already exists';
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_direct_message IS 
  'Creates notification when a direct message is sent. Includes error handling to prevent message insertion failures.';

COMMENT ON POLICY "System can insert notifications" ON notifications IS 
  'Allows SECURITY DEFINER triggers and functions to insert notifications. RLS still applies to SELECT/UPDATE/DELETE operations.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed notification RLS policy for SECURITY DEFINER triggers';
  RAISE NOTICE '✅ Improved notify_direct_message trigger with error handling';
  RAISE NOTICE '✅ Migration 0134 complete - notifications should now work properly';
END $$;

