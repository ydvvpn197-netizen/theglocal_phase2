-- Enable Realtime for Poll Comments Table
-- Description: Adds poll_comments table to supabase_realtime publication
--              to enable real-time updates for poll comments (similar to regular comments)

DO $$
BEGIN
  -- Add poll_comments table to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'poll_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE poll_comments;
    RAISE NOTICE '✅ Poll_comments table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Poll_comments table already in supabase_realtime publication';
  END IF;

  -- Set replica identity to allow tracking of UPDATE events
  -- This is important for real-time updates to work properly
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'poll_comments'
  ) THEN
    ALTER TABLE poll_comments REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ Poll_comments table replica identity set to FULL';
  END IF;
END $$;

