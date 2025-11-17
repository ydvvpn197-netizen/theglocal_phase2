-- Migration: Add trigger to auto-increment poll total_votes
-- Ensures database-level consistency for vote counts
-- Created: October 7, 2025

-- Function to increment poll total_votes when a vote is inserted
CREATE OR REPLACE FUNCTION increment_poll_total_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Increment total_votes by 1 for each vote inserted
  -- Using array_length to count the number of selected options
  UPDATE polls
  SET total_votes = total_votes + 1
  WHERE id = NEW.poll_id;
  
  RETURN NEW;
END;
$$;

-- Comment on function
COMMENT ON FUNCTION increment_poll_total_votes IS 'Automatically increments poll total_votes when a vote is inserted';

-- Create trigger on poll_votes INSERT
CREATE TRIGGER poll_vote_insert_trigger
AFTER INSERT ON poll_votes
FOR EACH ROW
EXECUTE FUNCTION increment_poll_total_votes();

-- Comment on trigger
COMMENT ON TRIGGER poll_vote_insert_trigger ON poll_votes IS 'Auto-increments poll total_votes on vote insert';

