-- ============================================
-- SIMPLIFY MESSAGES RLS POLICIES FOR REALTIME
-- Version: 0135
-- Description: Simplify RLS policies to improve realtime message delivery
-- Date: 2025-01-27
-- ============================================

-- Drop existing complex policy
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

-- Create simpler, more efficient policy
-- This policy is more realtime-friendly as it avoids complex nested queries
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    -- More efficient: use IN instead of EXISTS with subquery
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE participant_1_id = auth.uid() 
         OR participant_2_id = auth.uid()
    )
  );

-- Add index to speed up conversation_id lookups
-- This improves both regular queries and realtime filtering
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
  ON messages(conversation_id);

-- Add composite index for conversation + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- Verify messages table is in realtime publication (should already be there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    RAISE NOTICE '✅ Messages table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Messages table already in supabase_realtime publication';
  END IF;
END $$;

-- Verify REPLICA IDENTITY is FULL (should already be set)
DO $$
DECLARE
  rep_identity TEXT;
BEGIN
  SELECT CASE 
    WHEN c.relreplident = 'f' THEN 'FULL'
    WHEN c.relreplident = 'd' THEN 'DEFAULT'
    ELSE 'OTHER'
  END INTO rep_identity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'messages';
  
  IF rep_identity = 'FULL' THEN
    RAISE NOTICE '✅ Messages table already has REPLICA IDENTITY FULL';
  ELSE
    ALTER TABLE messages REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ Messages table REPLICA IDENTITY set to FULL';
  END IF;
END $$;

