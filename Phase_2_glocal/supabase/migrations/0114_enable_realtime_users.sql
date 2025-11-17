-- Enable Realtime for Users Table
-- Description: Adds users table to supabase_realtime publication
--              to enable real-time updates for user profile changes
--              This allows users to see profile updates (handle, avatar, location, etc.) in realtime

DO $$
BEGIN
  -- Add users table to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
    RAISE NOTICE '✅ Users table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Users table already in supabase_realtime publication';
  END IF;

  -- Set replica identity to allow tracking of UPDATE events
  -- This is important for real-time updates to work properly
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ Users table replica identity set to FULL';
  END IF;
END $$;

