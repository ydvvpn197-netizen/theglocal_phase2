-- Enable Realtime for Votes and Communities Tables
-- Description: Adds votes and communities tables to supabase_realtime publication
--              to enable real-time updates for votes and community creation/updates

DO $$
BEGIN
  -- STEP 1: Add votes table to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
    RAISE NOTICE '✅ Votes table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Votes table already in supabase_realtime publication';
  END IF;

  -- STEP 2: Add communities table to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'communities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE communities;
    RAISE NOTICE '✅ Communities table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Communities table already in supabase_realtime publication';
  END IF;

  -- STEP 3: Add community_members table to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'community_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_members;
    RAISE NOTICE '✅ Community_members table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ℹ️ Community_members table already in supabase_realtime publication';
  END IF;
END $$;

