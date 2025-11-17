-- Migration: Add triggers for automatic poll option vote counting
-- Version: 0125
-- Description: Automatically update poll_options.vote_count when votes are inserted/updated/deleted
-- This eliminates the need for manual vote count recalculation in the API

SET search_path TO public;

-- ============================================
-- PART 1: FUNCTION TO UPDATE OPTION VOTE COUNTS
-- ============================================

-- Function to recalculate vote counts for all options in a poll
-- This is called when a vote is inserted, updated, or deleted
CREATE OR REPLACE FUNCTION update_poll_option_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_poll_id UUID;
  option_record RECORD;
  calculated_vote_count INTEGER;
BEGIN
  -- Determine which poll_id to use based on trigger event
  IF TG_OP = 'DELETE' THEN
    target_poll_id := OLD.poll_id;
  ELSE
    target_poll_id := NEW.poll_id;
  END IF;

  -- Recalculate vote count for each option in the poll
  FOR option_record IN
    SELECT id FROM poll_options WHERE poll_id = target_poll_id
  LOOP
    -- Count votes where this option ID is in the selected_option_ids array
    SELECT COUNT(*)
    INTO calculated_vote_count
    FROM poll_votes
    WHERE poll_id = target_poll_id
      AND option_record.id = ANY(selected_option_ids);

    -- Update the option's vote count with the calculated value
    UPDATE poll_options
    SET vote_count = COALESCE(calculated_vote_count, 0)
    WHERE id = option_record.id;
  END LOOP;

  -- Return appropriate record based on trigger operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_poll_option_vote_counts IS 'Automatically recalculates vote counts for all options in a poll when votes are inserted, updated, or deleted';

-- ============================================
-- PART 2: CREATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS poll_vote_option_count_insert_trigger ON poll_votes;
DROP TRIGGER IF EXISTS poll_vote_option_count_update_trigger ON poll_votes;
DROP TRIGGER IF EXISTS poll_vote_option_count_delete_trigger ON poll_votes;

-- Trigger for INSERT: Update option counts when a new vote is created
CREATE TRIGGER poll_vote_option_count_insert_trigger
AFTER INSERT ON poll_votes
FOR EACH ROW
EXECUTE FUNCTION update_poll_option_vote_counts();

-- Trigger for UPDATE: Update option counts when a vote is changed
CREATE TRIGGER poll_vote_option_count_update_trigger
AFTER UPDATE ON poll_votes
FOR EACH ROW
WHEN (OLD.selected_option_ids IS DISTINCT FROM NEW.selected_option_ids)
EXECUTE FUNCTION update_poll_option_vote_counts();

-- Trigger for DELETE: Update option counts when a vote is deleted
CREATE TRIGGER poll_vote_option_count_delete_trigger
AFTER DELETE ON poll_votes
FOR EACH ROW
EXECUTE FUNCTION update_poll_option_vote_counts();

COMMENT ON TRIGGER poll_vote_option_count_insert_trigger ON poll_votes IS 'Updates poll option vote counts when a vote is inserted';
COMMENT ON TRIGGER poll_vote_option_count_update_trigger ON poll_votes IS 'Updates poll option vote counts when a vote is updated';
COMMENT ON TRIGGER poll_vote_option_count_delete_trigger ON poll_votes IS 'Updates poll option vote counts when a vote is deleted';

-- ============================================
-- PART 3: INITIALIZE EXISTING DATA
-- ============================================

-- Recalculate vote counts for all existing polls
-- This ensures data consistency for polls that already have votes
DO $$
DECLARE
  poll_record RECORD;
  option_record RECORD;
  calculated_vote_count INTEGER;
BEGIN
  FOR poll_record IN
    SELECT DISTINCT poll_id FROM poll_votes
  LOOP
    FOR option_record IN
      SELECT id FROM poll_options WHERE poll_id = poll_record.poll_id
    LOOP
      SELECT COUNT(*)
      INTO calculated_vote_count
      FROM poll_votes
      WHERE poll_id = poll_record.poll_id
        AND option_record.id = ANY(selected_option_ids);

      UPDATE poll_options
      SET vote_count = COALESCE(calculated_vote_count, 0)
      WHERE id = option_record.id;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Initialized vote counts for all existing polls';
END $$;

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll option vote counting triggers created!';
  RAISE NOTICE '✅ Triggers will automatically update option vote counts on INSERT/UPDATE/DELETE';
  RAISE NOTICE '✅ Existing vote counts have been recalculated';
  RAISE NOTICE '📝 Migration 0125 complete';
END $$;

