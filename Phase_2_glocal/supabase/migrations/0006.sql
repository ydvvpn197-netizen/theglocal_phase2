-- Artist Visibility with Grace Period Migration
-- Version: 0006
-- Description: Update artist visibility to include 15-day grace period after subscription expires
-- Date: 2025-10-07

-- ============================================
-- ADD MISSING FIELDS TO ARTISTS TABLE
-- ============================================

-- Add subscription_cancelled_at field if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' 
    AND column_name = 'subscription_cancelled_at'
  ) THEN
    ALTER TABLE artists ADD COLUMN subscription_cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add trial_end_date field if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' 
    AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE artists ADD COLUMN trial_end_date TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- UPDATE ARTIST VISIBILITY POLICY
-- ============================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view active artists" ON artists;

-- Create updated policy with grace period logic
CREATE POLICY "Anyone can view active artists with grace period"
  ON artists FOR SELECT
  USING (
    -- Show artists with active or trial subscriptions
    subscription_status IN ('trial', 'active')
    OR
    -- Show expired artists within 15-day grace period
    (
      subscription_status = 'expired' 
      AND subscription_end_date IS NOT NULL
      AND subscription_end_date >= (CURRENT_DATE - INTERVAL '15 days')
    )
  );

COMMENT ON POLICY "Anyone can view active artists with grace period" ON artists IS
  'Shows artists with active/trial subscriptions, or expired subscriptions within 15-day grace period';

-- ============================================
-- ADD FUNCTION TO CHECK VISIBILITY STATUS
-- ============================================

-- Function to determine if an artist profile should be visible
CREATE OR REPLACE FUNCTION is_artist_visible(
  status TEXT,
  end_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    status IN ('trial', 'active')
    OR
    (
      status = 'expired'
      AND end_date IS NOT NULL
      AND end_date >= (CURRENT_DATE - INTERVAL '15 days')
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_artist_visible IS
  'Checks if an artist profile should be publicly visible based on subscription status and grace period';

-- ============================================
-- ADD FUNCTION TO AUTO-EXPIRE SUBSCRIPTIONS
-- ============================================

-- Function to automatically update expired subscriptions
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update artists with expired subscriptions (past end date)
  WITH updated AS (
    UPDATE artists
    SET subscription_status = 'expired'
    WHERE subscription_status IN ('trial', 'active')
      AND subscription_end_date IS NOT NULL
      AND subscription_end_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_expired_subscriptions IS
  'Automatically marks subscriptions as expired when past their end date. Should be called via cron job.';

-- ============================================
-- ADD FUNCTION TO HIDE PROFILES PAST GRACE PERIOD
-- ============================================

-- Function to hide profiles that are past grace period
CREATE OR REPLACE FUNCTION hide_expired_artist_profiles()
RETURNS INTEGER AS $$
DECLARE
  hidden_count INTEGER;
BEGIN
  -- Mark artists as 'hidden' when grace period expires
  -- Note: We use 'cancelled' status to hide them from public view
  WITH hidden AS (
    UPDATE artists
    SET subscription_status = 'cancelled'
    WHERE subscription_status = 'expired'
      AND subscription_end_date IS NOT NULL
      AND subscription_end_date < (CURRENT_DATE - INTERVAL '15 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO hidden_count FROM hidden;
  
  RETURN hidden_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION hide_expired_artist_profiles IS
  'Hides artist profiles that have been expired for more than 15 days. Should be called via cron job.';

