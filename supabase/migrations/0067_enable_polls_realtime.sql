-- Enable real-time for polls and poll_options tables
-- This allows live updates of vote counts and poll analytics

-- Enable real-time for polls table
ALTER PUBLICATION supabase_realtime ADD TABLE polls;

-- Enable real-time for poll_options table
ALTER PUBLICATION supabase_realtime ADD TABLE poll_options;

-- Set replica identity to allow tracking of UPDATE events
ALTER TABLE polls REPLICA IDENTITY FULL;
ALTER TABLE poll_options REPLICA IDENTITY FULL;

