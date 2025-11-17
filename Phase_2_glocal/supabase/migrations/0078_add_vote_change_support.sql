-- Migration: Add support for changing votes in polls
-- Version: 0078
-- Description: Add function to decrement poll option votes and update vote logic
-- Date: 2025-01-20

SET search_path TO public;

-- ============================================
-- PART 1: ADD DECREMENT FUNCTION FOR OPTIONS
-- ============================================

-- Function to decrement poll option vote count atomically
CREATE OR REPLACE FUNCTION decrement_poll_option_votes(option_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE poll_options
  SET vote_count = vote_count - 1
  WHERE id = option_id AND vote_count > 0;
END;
$$;

COMMENT ON FUNCTION decrement_poll_option_votes IS 'Atomically decrements vote count for a poll option';

-- ============================================
-- PART 2: ADD DECREMENT FUNCTION FOR TOTAL VOTES
-- ============================================

-- Add trigger to decrement total_votes when a poll_vote is deleted
CREATE OR REPLACE FUNCTION decrement_poll_total_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE polls
  SET total_votes = total_votes - 1
  WHERE id = OLD.poll_id AND total_votes > 0;
  
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION decrement_poll_total_votes IS 'Automatically decrements poll total_votes when a vote is deleted';

-- ============================================
-- PART 3: CREATE DELETE TRIGGER
-- ============================================

-- Create trigger for decrementing total votes on delete
DROP TRIGGER IF EXISTS poll_vote_delete_trigger ON poll_votes;

CREATE TRIGGER poll_vote_delete_trigger
AFTER DELETE ON poll_votes
FOR EACH ROW
EXECUTE FUNCTION decrement_poll_total_votes();

-- ============================================
-- PART 4: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions for decrement function
GRANT EXECUTE ON FUNCTION decrement_poll_option_votes(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_poll_total_votes() TO authenticated, anon;

-- ============================================
-- PART 5: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Vote change support migration complete!';
  RAISE NOTICE '✅ Added decrement functions for option and total votes';
  RAISE NOTICE '✅ Created trigger for vote deletion';
  RAISE NOTICE '✅ Grant permissions to authenticated and anon users';
  RAISE NOTICE '📝 Migration 0078 complete';
END$$;
