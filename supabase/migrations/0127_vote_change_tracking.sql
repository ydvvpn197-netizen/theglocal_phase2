-- Migration: Add vote change tracking to poll_votes
-- Version: 0127
-- Description: Add vote_changed_at timestamp to track when votes are changed

SET search_path TO public;

-- ============================================
-- PART 1: ADD VOTE_CHANGED_AT COLUMN
-- ============================================

-- Add vote_changed_at column to track when a vote is updated
ALTER TABLE poll_votes
ADD COLUMN IF NOT EXISTS vote_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN poll_votes.vote_changed_at IS 'Timestamp when vote was changed (NULL if vote has never been changed)';

-- ============================================
-- PART 2: CREATE TRIGGER TO UPDATE VOTE_CHANGED_AT
-- ============================================

-- Function to update vote_changed_at when vote is updated
CREATE OR REPLACE FUNCTION update_vote_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update vote_changed_at if selected_option_ids actually changed
  IF OLD.selected_option_ids IS DISTINCT FROM NEW.selected_option_ids THEN
    NEW.vote_changed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_vote_changed_at IS 'Updates vote_changed_at timestamp when vote is changed';

-- Create trigger to update vote_changed_at on UPDATE
DROP TRIGGER IF EXISTS trigger_update_vote_changed_at ON poll_votes;

CREATE TRIGGER trigger_update_vote_changed_at
BEFORE UPDATE ON poll_votes
FOR EACH ROW
EXECUTE FUNCTION update_vote_changed_at();

COMMENT ON TRIGGER trigger_update_vote_changed_at ON poll_votes IS 'Automatically updates vote_changed_at when vote is changed';

-- ============================================
-- PART 3: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Vote change tracking added!';
  RAISE NOTICE '✅ vote_changed_at column added to poll_votes table';
  RAISE NOTICE '✅ Trigger created to automatically update vote_changed_at';
  RAISE NOTICE '📝 Migration 0127 complete';
END $$;

