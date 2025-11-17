-- Subscription Reminders Migration
-- Version: 0007
-- Description: Add fields to track email reminders for subscription renewals
-- Date: 2025-10-07

-- ============================================
-- ADD REMINDER TRACKING FIELDS
-- ============================================

-- Add field to track when renewal reminder was sent
ALTER TABLE artists ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ;

-- Add field to track when expiry notification was sent
ALTER TABLE artists ADD COLUMN IF NOT EXISTS expiry_notification_sent_at TIMESTAMPTZ;

-- Add index for efficient querying of artists needing reminders
CREATE INDEX IF NOT EXISTS idx_artists_renewal_reminder ON artists(subscription_end_date, renewal_reminder_sent_at)
  WHERE subscription_status IN ('trial', 'active');

COMMENT ON COLUMN artists.renewal_reminder_sent_at IS
  'Timestamp when 3-day renewal reminder email was sent';

COMMENT ON COLUMN artists.expiry_notification_sent_at IS
  'Timestamp when subscription expired notification was sent';

-- ============================================
-- FUNCTION TO GET ARTISTS NEEDING RENEWAL REMINDER
-- ============================================

CREATE OR REPLACE FUNCTION get_artists_needing_renewal_reminder()
RETURNS TABLE (
  artist_id UUID,
  artist_email TEXT,
  stage_name TEXT,
  subscription_end_date DATE,
  subscription_plan TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as artist_id,
    u.email as artist_email,
    a.stage_name,
    a.subscription_end_date,
    COALESCE(s.plan, 'monthly') as subscription_plan
  FROM artists a
  JOIN users u ON u.id = a.id
  LEFT JOIN subscriptions s ON s.artist_id = a.id AND s.status IN ('trial', 'active')
  WHERE 
    -- Subscription is active or in trial
    a.subscription_status IN ('trial', 'active')
    -- Subscription ends in exactly 3 days
    AND a.subscription_end_date = (CURRENT_DATE + INTERVAL '3 days')::DATE
    -- Reminder hasn't been sent yet, or was sent more than 7 days ago (for recurring reminders)
    AND (
      a.renewal_reminder_sent_at IS NULL 
      OR a.renewal_reminder_sent_at < (NOW() - INTERVAL '7 days')
    )
  ORDER BY a.subscription_end_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_artists_needing_renewal_reminder IS
  'Returns artists whose subscriptions are renewing in 3 days and haven''t received a reminder yet';

-- ============================================
-- FUNCTION TO GET ARTISTS NEEDING EXPIRY NOTIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION get_artists_needing_expiry_notification()
RETURNS TABLE (
  artist_id UUID,
  artist_email TEXT,
  stage_name TEXT,
  subscription_end_date DATE,
  grace_period_end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as artist_id,
    u.email as artist_email,
    a.stage_name,
    a.subscription_end_date,
    (a.subscription_end_date + INTERVAL '15 days')::DATE as grace_period_end_date
  FROM artists a
  JOIN users u ON u.id = a.id
  WHERE 
    -- Subscription just expired
    a.subscription_status = 'expired'
    -- Expiry notification hasn't been sent yet
    AND a.expiry_notification_sent_at IS NULL
  ORDER BY a.subscription_end_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_artists_needing_expiry_notification IS
  'Returns artists whose subscriptions have expired and haven''t received an expiry notification yet';

-- ============================================
-- FUNCTION TO MARK RENEWAL REMINDER SENT
-- ============================================

CREATE OR REPLACE FUNCTION mark_renewal_reminder_sent(p_artist_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE artists
  SET renewal_reminder_sent_at = NOW()
  WHERE id = p_artist_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_renewal_reminder_sent IS
  'Marks that a renewal reminder email has been sent to the artist';

-- ============================================
-- FUNCTION TO MARK EXPIRY NOTIFICATION SENT
-- ============================================

CREATE OR REPLACE FUNCTION mark_expiry_notification_sent(p_artist_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE artists
  SET expiry_notification_sent_at = NOW()
  WHERE id = p_artist_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_expiry_notification_sent IS
  'Marks that an expiry notification email has been sent to the artist';

