-- Standardize Trial Column Migration
-- Version: 0046
-- Description: Standardize trial_end_date column and add RLS policy for pending artists
-- Date: 2025-01-16

-- ============================================
-- STANDARDIZE TRIAL COLUMN IN ARTISTS TABLE
-- ============================================

-- First, check if trial_ends_at exists and migrate data to trial_end_date
DO $$ 
BEGIN
  -- Check if trial_ends_at column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'trial_ends_at'
  ) THEN
    -- Migrate data from trial_ends_at to trial_end_date if trial_end_date is null
    UPDATE artists 
    SET trial_end_date = trial_ends_at 
    WHERE trial_end_date IS NULL AND trial_ends_at IS NOT NULL;
    
    -- Drop the old trial_ends_at column
    ALTER TABLE artists DROP COLUMN trial_ends_at;
  END IF;
END $$;

-- Ensure trial_end_date column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE artists ADD COLUMN trial_end_date TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- UPDATE RLS POLICIES FOR PENDING ARTISTS
-- ============================================

-- Drop existing artist visibility policy to recreate with pending support
DROP POLICY IF EXISTS "Anyone can view active artists with grace period" ON artists;
DROP POLICY IF EXISTS "Anyone can view active artists" ON artists;

-- Create comprehensive artist visibility policy
CREATE POLICY "Artist visibility with pending support"
  ON artists FOR SELECT
  USING (
    -- Show artists with active or trial subscriptions to everyone
    subscription_status IN ('trial', 'active')
    OR
    -- Show expired artists within 15-day grace period to everyone
    (
      subscription_status = 'expired' 
      AND subscription_end_date IS NOT NULL
      AND subscription_end_date >= (CURRENT_DATE - INTERVAL '15 days')
    )
    OR
    -- Allow users to view their own pending profiles
    (
      auth.uid() = id AND subscription_status = 'pending'
    )
  );

-- Add comment for clarity
COMMENT ON POLICY "Artist visibility with pending support" ON artists IS
  'Shows public artists (trial/active/grace period) and allows users to view their own pending profiles';

-- ============================================
-- UPDATE EXISTING FUNCTIONS
-- ============================================

-- Drop existing is_artist_visible function to avoid conflicts
DROP FUNCTION IF EXISTS is_artist_visible(TEXT, DATE);

-- Update the is_artist_visible function to handle pending status
CREATE OR REPLACE FUNCTION is_artist_visible(
  status TEXT,
  end_date DATE,
  user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Public visibility for active/trial artists
    status IN ('trial', 'active')
    OR
    -- Public visibility for expired artists within grace period
    (
      status = 'expired'
      AND end_date IS NOT NULL
      AND end_date >= (CURRENT_DATE - INTERVAL '15 days')
    )
    OR
    -- Private visibility for user's own pending profile
    (
      status = 'pending'
      AND user_id IS NOT NULL
      AND user_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_artist_visible IS
  'Checks if an artist profile should be visible based on subscription status, grace period, and user ownership';

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON COLUMN artists.trial_end_date IS 'End date of free trial period (standardized column name)';
