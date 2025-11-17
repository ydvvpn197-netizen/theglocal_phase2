-- Migration: Fix poll_votes RLS policies
-- Version: 0080
-- Description: Re-enable RLS on poll_votes table and ensure proper voting permissions
-- Date: 2025-01-20

SET search_path TO public;

-- ============================================
-- PART 1: RE-ENABLE RLS ON POLL_VOTES TABLE
-- ============================================

-- Re-enable RLS on poll_votes (was disabled in migration 0036)
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: ENSURE PROPER VOTING POLICIES
-- ============================================

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Poll votes are anonymous" ON poll_votes;
DROP POLICY IF EXISTS "Anyone can vote on polls" ON poll_votes;
DROP POLICY IF EXISTS "Poll votes are permanent" ON poll_votes;
DROP POLICY IF EXISTS "Poll votes cannot be deleted" ON poll_votes;
DROP POLICY IF EXISTS "Users can update own poll votes" ON poll_votes;

-- ============================================
-- PART 3: CREATE ANONYMOUS VOTING POLICIES
-- ============================================

-- Users cannot view any poll votes (fully anonymous)
CREATE POLICY "Poll votes are anonymous"
  ON poll_votes FOR SELECT
  USING (false);

-- Authenticated users can insert poll votes (anonymous)
CREATE POLICY "Authenticated users can vote on polls"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own votes (using vote_hash verification)
CREATE POLICY "Users can update own poll votes"
  ON poll_votes FOR UPDATE
  USING (can_update_poll_vote(id))
  WITH CHECK (can_update_poll_vote(id));

-- Users cannot delete poll votes (permanent)
CREATE POLICY "Poll votes cannot be deleted"
  ON poll_votes FOR DELETE
  USING (false);

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll votes RLS re-enabled!';
  RAISE NOTICE '✅ Anonymous voting policies restored';
  RAISE NOTICE '✅ Vote update permissions maintained';
  RAISE NOTICE '✅ All authenticated users can vote';
  RAISE NOTICE '📝 Migration 0080 complete';
END$$;

COMMENT ON TABLE poll_votes IS 'RLS re-enabled - anonymous voting with vote change support';
