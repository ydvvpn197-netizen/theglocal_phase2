-- Enable Realtime for Messages and Conversations Tables
-- Description: Sets REPLICA IDENTITY FULL for messages and conversations tables
--              to enable real-time updates for message creation, updates, and deletions
--              This allows users to see new messages immediately without manual refresh

DO $$
BEGIN
  -- Set replica identity for messages table to allow tracking of UPDATE events
  -- This is important for real-time updates to work properly
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ Messages table replica identity set to FULL';
  END IF;

  -- Set replica identity for conversations table to allow tracking of UPDATE events
  -- This is important for real-time conversation updates (like last_message_at)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations'
  ) THEN
    ALTER TABLE conversations REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ Conversations table replica identity set to FULL';
  END IF;

  -- Verify that tables are in supabase_realtime publication
  -- (They should already be from migration 0079_messaging_system.sql)
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    RAISE NOTICE '✅ Conversations table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Conversations table already in supabase_realtime publication';
  END IF;
END $$;

