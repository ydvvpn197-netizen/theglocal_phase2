-- Fix conversation creation constraint violation
-- This migration addresses the "participant_order" check constraint error
-- that occurs when users try to message each other for the first time

-- Add unique constraint to prevent duplicate conversations
-- This enables ON CONFLICT handling in the function
ALTER TABLE conversations
ADD CONSTRAINT unique_conversation_participants 
UNIQUE (participant_1_id, participant_2_id);

-- Update the get_or_create_conversation function with proper error handling
-- and conflict resolution to prevent constraint violations
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user1_id UUID,
  user2_id UUID
) RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Validate input
  IF user1_id = user2_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Ensure consistent ordering
  IF user1_id < user2_id THEN
    smaller_id := user1_id;
    larger_id := user2_id;
  ELSE
    smaller_id := user2_id;
    larger_id := user1_id;
  END IF;

  -- Try to find existing conversation (bypass RLS)
  SELECT id INTO conversation_id
  FROM conversations
  WHERE participant_1_id = smaller_id AND participant_2_id = larger_id;

  -- If not found, create new conversation with conflict handling
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (participant_1_id, participant_2_id)
    VALUES (smaller_id, larger_id)
    ON CONFLICT (participant_1_id, participant_2_id) DO NOTHING
    RETURNING id INTO conversation_id;
    
    -- If INSERT returned nothing (conflict occurred), fetch the existing conversation
    IF conversation_id IS NULL THEN
      SELECT id INTO conversation_id
      FROM conversations
      WHERE participant_1_id = smaller_id AND participant_2_id = larger_id;
    END IF;
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
