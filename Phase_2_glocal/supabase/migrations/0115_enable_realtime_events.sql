-- Enable Realtime for Events Table
-- Description: Adds events table to supabase_realtime publication
--              to enable real-time updates for event creation, updates, and deletions
--              This allows users to see new events immediately without manual refresh

DO $$
BEGIN
  -- Add events table to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE events;
    RAISE NOTICE '✅ Events table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Events table already in supabase_realtime publication';
  END IF;

  -- Set replica identity to allow tracking of UPDATE events
  -- This is important for real-time updates to work properly
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ Events table replica identity set to FULL';
  END IF;
END $$;

