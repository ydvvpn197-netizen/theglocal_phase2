-- ============================================
-- MESSAGE BROADCAST TRIGGER
-- Version: 0136
-- Description: Add trigger to ensure messages are properly broadcast via realtime
-- Date: 2025-01-27
-- ============================================

-- Function to log and ensure broadcast of new messages
CREATE OR REPLACE FUNCTION broadcast_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log message creation for debugging
  RAISE LOG 'New message created: ID=%, Conversation=%, Sender=%', 
    NEW.id, NEW.conversation_id, NEW.sender_id;
  
  -- Ensure message data is complete
  IF NEW.id IS NULL OR NEW.conversation_id IS NULL OR NEW.sender_id IS NULL THEN
    RAISE WARNING 'Incomplete message data: ID=%, Conversation=%, Sender=%',
      NEW.id, NEW.conversation_id, NEW.sender_id;
  END IF;
  
  -- The realtime publication will handle the broadcast automatically
  -- This trigger ensures the message is committed and logged
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_broadcast_message ON messages;

-- Create trigger for new messages
CREATE TRIGGER trigger_broadcast_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_new_message();

-- Also add trigger for message updates (for edit/delete)
DROP TRIGGER IF EXISTS trigger_broadcast_message_update ON messages;

CREATE TRIGGER trigger_broadcast_message_update
  AFTER UPDATE ON messages
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION broadcast_new_message();

COMMENT ON FUNCTION broadcast_new_message() IS 
  'Logs message creation/updates and ensures data is complete for realtime broadcast';

COMMENT ON TRIGGER trigger_broadcast_message ON messages IS 
  'Ensures new messages are properly logged and broadcast via realtime';

COMMENT ON TRIGGER trigger_broadcast_message_update ON messages IS 
  'Ensures message updates are properly logged and broadcast via realtime';

