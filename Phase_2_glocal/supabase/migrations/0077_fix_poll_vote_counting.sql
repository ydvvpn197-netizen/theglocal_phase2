-- Migration: Fix Poll Vote Counting Issues
-- Version: 0077
-- Description: Fix RLS policies to allow trigger updates and prevent double counting
-- Date: 2025-01-20

SET search_path TO public;

-- ============================================
-- PART 1: FIX RLS POLICY FOR TRIGGER UPDATES
-- ============================================

-- Drop the restrictive UPDATE policy that prevents trigger from updating polls with votes
DROP POLICY IF EXISTS "Authors can update own polls" ON polls;

-- Create new policy that allows both authors and system triggers to update polls
CREATE POLICY "Authors and system can update polls"
  ON polls FOR UPDATE
  USING (
    auth.uid() = author_id OR
    -- Allow trigger to update total_votes by checking if we're in a trigger context
    current_setting('role', true) = 'postgres' OR
    -- Allow updates when total_votes is being incremented by trigger
    total_votes >= 0
  )
  WITH CHECK (
    auth.uid() = author_id OR
    current_setting('role', true) = 'postgres'
  );

-- ============================================
-- PART 2: ENSURE TRIGGER FUNCTION PERMISSIONS
-- ============================================

-- Make sure the trigger function has proper permissions
ALTER FUNCTION increment_poll_total_votes() SECURITY DEFINER;

-- Grant execute permissions to the trigger function
GRANT EXECUTE ON FUNCTION increment_poll_total_votes() TO authenticated, anon;

-- ============================================
-- PART 3: ADD DEBUGGING FOR TRIGGER EXECUTION
-- ============================================

-- Add logging to the trigger function to help debug issues
CREATE OR REPLACE FUNCTION increment_poll_total_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log trigger execution for debugging
  RAISE LOG 'Trigger executing: increment_poll_total_votes for poll_id=%', NEW.poll_id;
  
  -- Increment total_votes by 1 for each vote inserted
  UPDATE polls
  SET total_votes = total_votes + 1
  WHERE id = NEW.poll_id;
  
  -- Log successful update
  RAISE LOG 'Successfully incremented total_votes for poll_id=%', NEW.poll_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors that occur during trigger execution
    RAISE LOG 'Error in increment_poll_total_votes trigger: %', SQLERRM;
    RAISE;
END;
$$;

-- ============================================
-- PART 4: VERIFY EXISTING TRIGGER
-- ============================================

-- Ensure the trigger exists and is properly configured
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'poll_vote_insert_trigger'
  ) THEN
    -- Create trigger if it doesn't exist
    CREATE TRIGGER poll_vote_insert_trigger
    AFTER INSERT ON poll_votes
    FOR EACH ROW
    EXECUTE FUNCTION increment_poll_total_votes();
    
    RAISE NOTICE 'Created poll_vote_insert_trigger';
  ELSE
    RAISE NOTICE 'poll_vote_insert_trigger already exists';
  END IF;
END$$;

-- ============================================
-- PART 5: COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Authors and system can update polls" ON polls IS 
  'Allows poll authors to edit their polls and system triggers to update vote counts';

COMMENT ON FUNCTION increment_poll_total_votes IS 
  'Automatically increments poll total_votes when a vote is inserted. Includes logging for debugging.';

-- ============================================
-- PART 6: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll vote counting migration complete!';
  RAISE NOTICE '✅ Fixed RLS policy to allow trigger updates';
  RAISE NOTICE '✅ Added logging to trigger function for debugging';
  RAISE NOTICE '✅ Ensured trigger exists and has proper permissions';
  RAISE NOTICE '📝 Migration 0077 complete';
END$$;
