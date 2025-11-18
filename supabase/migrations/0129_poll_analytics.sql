-- Migration: Add poll analytics tracking
-- Version: 0129
-- Description: Create poll_vote_history table to track vote distribution over time

SET search_path TO public;

-- ============================================
-- PART 1: CREATE POLL_VOTE_HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS poll_vote_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  vote_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interval_type TEXT NOT NULL CHECK (interval_type IN ('hourly', 'daily')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE poll_vote_history IS 'Tracks vote distribution over time for poll analytics';
COMMENT ON COLUMN poll_vote_history.interval_type IS 'Type of interval: hourly or daily';
COMMENT ON COLUMN poll_vote_history.recorded_at IS 'Timestamp when this snapshot was recorded';
COMMENT ON COLUMN poll_vote_history.vote_count IS 'Number of votes for this option at the recorded time';

-- ============================================
-- PART 2: CREATE INDEXES
-- ============================================

-- Index for querying vote history by poll
CREATE INDEX IF NOT EXISTS idx_poll_vote_history_poll_id 
ON poll_vote_history(poll_id, recorded_at DESC);

-- Index for querying vote history by option
CREATE INDEX IF NOT EXISTS idx_poll_vote_history_option_id 
ON poll_vote_history(option_id, recorded_at DESC);

-- Index for querying by interval type
CREATE INDEX IF NOT EXISTS idx_poll_vote_history_interval 
ON poll_vote_history(poll_id, interval_type, recorded_at DESC);

COMMENT ON INDEX idx_poll_vote_history_poll_id IS 'Optimizes queries for vote history by poll';
COMMENT ON INDEX idx_poll_vote_history_option_id IS 'Optimizes queries for vote history by option';
COMMENT ON INDEX idx_poll_vote_history_interval IS 'Optimizes queries for vote history by interval type';

-- ============================================
-- PART 3: CREATE FUNCTION TO RECORD VOTE SNAPSHOT
-- ============================================

-- Function to record a snapshot of vote counts for analytics
CREATE OR REPLACE FUNCTION record_poll_vote_snapshot(
  target_poll_id UUID,
  interval_type_param TEXT DEFAULT 'hourly'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  option_record RECORD;
  current_vote_count INTEGER;
BEGIN
  -- Record vote count for each option in the poll
  FOR option_record IN
    SELECT id FROM poll_options WHERE poll_id = target_poll_id
  LOOP
    -- Get current vote count for this option
    SELECT COUNT(*)
    INTO current_vote_count
    FROM poll_votes
    WHERE poll_id = target_poll_id
      AND option_record.id = ANY(selected_option_ids);

    -- Insert snapshot
    INSERT INTO poll_vote_history (
      poll_id,
      option_id,
      vote_count,
      recorded_at,
      interval_type
    ) VALUES (
      target_poll_id,
      option_record.id,
      current_vote_count,
      NOW(),
      interval_type_param
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION record_poll_vote_snapshot IS 'Records a snapshot of vote counts for all options in a poll';

-- ============================================
-- PART 4: CREATE TRIGGER TO AUTO-RECORD SNAPSHOTS
-- ============================================

-- Function to automatically record hourly snapshots
CREATE OR REPLACE FUNCTION auto_record_poll_vote_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Record hourly snapshot when a vote is inserted or updated
  -- This can be called periodically or on vote changes
  PERFORM record_poll_vote_snapshot(NEW.poll_id, 'hourly');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_record_poll_vote_snapshot IS 'Automatically records vote snapshots when votes change';

-- Note: We'll use a scheduled job or manual calls to record snapshots
-- rather than triggering on every vote (to avoid performance issues)

-- ============================================
-- PART 5: GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON poll_vote_history TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_poll_vote_snapshot TO authenticated;

-- ============================================
-- PART 6: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll analytics tracking added!';
  RAISE NOTICE '✅ Created poll_vote_history table';
  RAISE NOTICE '✅ Created indexes for performance';
  RAISE NOTICE '✅ Created function to record vote snapshots';
  RAISE NOTICE '📝 Migration 0129 complete';
END $$;

