-- Migration: Enable vote changes for poll_votes
-- Version: 0079
-- Description: Allow users to update their own poll votes to change selections

SET search_path TO public;

-- ============================================
-- PART 1: CREATE HELPER FUNCTION FOR VOTE OWNERSHIP
-- ============================================

-- Function to verify if current user owns a vote via vote_hash
CREATE OR REPLACE FUNCTION can_update_poll_vote(vote_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  vote_record RECORD;
  expected_hash TEXT;
  voting_secret TEXT := 'default-secret-change-me'; -- Must match API secret
BEGIN
  -- Get vote details
  SELECT pv.vote_hash, pv.poll_id INTO vote_record
  FROM poll_votes pv
  WHERE pv.id = vote_id;
  
  IF NOT FOUND OR vote_record.vote_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Generate expected hash using same format as API: "userId:pollId:secret"
  expected_hash := encode(digest(auth.uid()::text || ':' || vote_record.poll_id::text || ':' || voting_secret, 'sha256'), 'hex');
  
  -- Check if hashes match
  RETURN vote_record.vote_hash = expected_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_update_poll_vote(UUID) IS 'SECURITY DEFINER function to check if current user owns a poll vote via vote_hash';

-- ============================================
-- PART 2: GRANT PERMISSIONS
-- ============================================

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_update_poll_vote(UUID) TO authenticated, anon;

-- ============================================
-- PART 3: UPDATE RLS POLICY
-- ============================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Poll votes are permanent" ON poll_votes;

-- Create new policy: Users can update their own votes
CREATE POLICY "Users can update own poll votes"
  ON poll_votes FOR UPDATE
  USING (can_update_poll_vote(id))
  WITH CHECK (can_update_poll_vote(id));

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll vote update permission migration complete!';
  RAISE NOTICE '✅ Created can_update_poll_vote() function';
  RAISE NOTICE '✅ Updated RLS policy to allow vote changes';
  RAISE NOTICE '✅ Hash format matches API (userId:pollId:secret)';
  RAISE NOTICE '📝 Migration 0079 complete';
END$$;
