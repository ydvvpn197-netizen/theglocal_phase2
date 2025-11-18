-- Fix Poll Permissions and Add Edit Tracking
-- Version: 0068
-- Description: Add DELETE policies, edit tracking columns, and support for multiple choice polls
-- Date: 2025-01-20

SET search_path TO public;

-- ============================================
-- PART 1: ADD NEW COLUMNS TO POLLS TABLE
-- ============================================

-- Add edit tracking columns
ALTER TABLE polls ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Add max_selections column for multiple choice polls
ALTER TABLE polls ADD COLUMN IF NOT EXISTS max_selections INTEGER DEFAULT 1;

-- Update existing polls to have is_multiple_choice explicitly set
UPDATE polls SET is_multiple_choice = COALESCE(is_multiple_choice, false) WHERE is_multiple_choice IS NULL;

-- Ensure is_multiple_choice defaults to false for new polls
ALTER TABLE polls ALTER COLUMN is_multiple_choice SET DEFAULT false;

-- ============================================
-- PART 2: CREATE HELPER FUNCTION FOR POLL PERMISSIONS
-- ============================================

-- Function to check if user can delete a poll
CREATE OR REPLACE FUNCTION can_delete_poll_safe(poll_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  poll_author_id UUID;
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get poll author
  SELECT author_id INTO poll_author_id
  FROM polls
  WHERE id = poll_id_param;
  
  -- Check if user is poll author
  IF poll_author_id = check_user_id THEN
    RETURN true;
  END IF;
  
  -- Check if user is community admin
  RETURN is_community_admin_safe(
    (SELECT community_id FROM polls WHERE id = poll_id_param),
    check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user can edit a poll
CREATE OR REPLACE FUNCTION can_edit_poll_safe(poll_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  poll_author_id UUID;
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get poll author
  SELECT author_id INTO poll_author_id
  FROM polls
  WHERE id = poll_id_param;
  
  -- Check if user is poll author
  IF poll_author_id = check_user_id THEN
    RETURN true;
  END IF;
  
  -- Check if user is community admin
  RETURN is_community_admin_safe(
    (SELECT community_id FROM polls WHERE id = poll_id_param),
    check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_delete_poll_safe(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_edit_poll_safe(UUID, UUID) TO authenticated, anon;

-- ============================================
-- PART 3: DROP OLD POLL DELETE POLICY (IF EXISTS)
-- ============================================

DROP POLICY IF EXISTS "Authors can delete own polls" ON polls;
DROP POLICY IF EXISTS "Admins can delete polls" ON polls;

-- ============================================
-- PART 4: CREATE NEW POLL DELETE POLICIES
-- ============================================

-- Poll creators can delete their polls anytime
CREATE POLICY "Poll creators can delete their polls"
  ON polls FOR DELETE
  USING (auth.uid() = author_id);

-- Community admins can delete polls in their communities
CREATE POLICY "Community admins can delete polls"
  ON polls FOR DELETE
  USING (
    is_community_admin_safe(community_id, auth.uid())
  );

-- ============================================
-- PART 5: CREATE POLL UPDATE POLICIES (WITH VOTES)
-- ============================================

-- Drop old restrictive UPDATE policy
DROP POLICY IF EXISTS "Authors can update own polls" ON polls;

-- New policy: Poll creators and admins can update polls anytime
CREATE POLICY "Poll creators and admins can update polls"
  ON polls FOR UPDATE
  USING (
    can_edit_poll_safe(id, auth.uid())
  )
  WITH CHECK (
    can_edit_poll_safe(id, auth.uid())
  );

-- ============================================
-- PART 6: ADD POLL_OPTIONS DELETE POLICY
-- ============================================

-- Allow deletion of poll options (for editing polls)
CREATE POLICY "Poll creators and admins can delete poll options"
  ON poll_options FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND can_edit_poll_safe(polls.id, auth.uid())
    )
  );

-- Allow updating poll options
CREATE POLICY "Poll creators and admins can update poll options"
  ON poll_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND can_edit_poll_safe(polls.id, auth.uid())
    )
  );

-- ============================================
-- PART 7: COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION can_delete_poll_safe(UUID, UUID) IS 
  'SECURITY DEFINER function to check if user can delete a poll. Returns true for poll creators or community admins. Prevents RLS recursion.';

COMMENT ON FUNCTION can_edit_poll_safe(UUID, UUID) IS 
  'SECURITY DEFINER function to check if user can edit a poll. Returns true for poll creators or community admins. Prevents RLS recursion.';

COMMENT ON COLUMN polls.edited_at IS 'Timestamp when poll was last edited';
COMMENT ON COLUMN polls.edit_count IS 'Number of times poll has been edited';
COMMENT ON COLUMN polls.max_selections IS 'Maximum number of options that can be selected (for multiple choice polls)';

-- ============================================
-- PART 8: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll permissions migration complete!';
  RAISE NOTICE '✅ Added edit tracking columns (edited_at, edit_count)';
  RAISE NOTICE '✅ Added multiple choice support (max_selections)';
  RAISE NOTICE '✅ Created DELETE policies for poll creators and community admins';
  RAISE NOTICE '✅ Created UPDATE policies allowing edits after votes';
  RAISE NOTICE '✅ Created SECURITY DEFINER functions to prevent RLS recursion';
  RAISE NOTICE '📝 Migration 0068 complete';
END$$;

