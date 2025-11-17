-- Migration: Poll voting functions
-- Atomic functions for incrementing poll vote counts
-- Created: October 7, 2025

-- Function to increment poll option vote count atomically
CREATE OR REPLACE FUNCTION increment_poll_option_votes(option_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE poll_options
  SET vote_count = vote_count + 1
  WHERE id = option_id;
END;
$$;

-- Comment on function
COMMENT ON FUNCTION increment_poll_option_votes IS 'Atomically increments vote count for a poll option';

