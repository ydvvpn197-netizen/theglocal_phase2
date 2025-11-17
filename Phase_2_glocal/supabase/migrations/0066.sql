-- Enhanced OTP Security
-- Version: 0066
-- Description: Add OTP attempt tracking and security measures
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- OTP ATTEMPT TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS otp_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL, -- email or phone
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_otp_attempts_user_identifier ON otp_attempts(user_identifier);
CREATE INDEX IF NOT EXISTS idx_otp_attempts_locked_until ON otp_attempts(locked_until);

-- ============================================
-- OTP SECURITY FUNCTIONS
-- ============================================

-- Function to check if user is locked out
CREATE OR REPLACE FUNCTION is_user_locked_out(p_identifier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_record RECORD;
BEGIN
  SELECT * INTO attempt_record 
  FROM otp_attempts 
  WHERE user_identifier = p_identifier;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if locked and lockout period has expired
  IF attempt_record.locked_until IS NOT NULL AND attempt_record.locked_until > NOW() THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to record OTP attempt
CREATE OR REPLACE FUNCTION record_otp_attempt(
  p_identifier TEXT,
  p_success BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_record RECORD;
  new_attempts INTEGER;
  should_lock BOOLEAN := FALSE;
BEGIN
  -- Get or create attempt record
  INSERT INTO otp_attempts (user_identifier, attempts, last_attempt)
  VALUES (p_identifier, 0, NOW())
  ON CONFLICT (user_identifier) DO NOTHING;
  
  SELECT * INTO attempt_record 
  FROM otp_attempts 
  WHERE user_identifier = p_identifier;
  
  IF p_success THEN
    -- Reset attempts on successful OTP
    UPDATE otp_attempts 
    SET attempts = 0, locked_until = NULL, last_attempt = NOW()
    WHERE user_identifier = p_identifier;
    RETURN TRUE;
  ELSE
    -- Increment failed attempts
    new_attempts := attempt_record.attempts + 1;
    
    -- Check if should lock (3 attempts)
    IF new_attempts >= 3 THEN
      should_lock := TRUE;
    END IF;
    
    UPDATE otp_attempts 
    SET 
      attempts = new_attempts,
      locked_until = CASE WHEN should_lock THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END,
      last_attempt = NOW()
    WHERE user_identifier = p_identifier;
    
    RETURN NOT should_lock;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check cooldown period (60 seconds between OTP requests)
CREATE OR REPLACE FUNCTION can_request_otp(p_identifier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_record RECORD;
BEGIN
  SELECT * INTO attempt_record 
  FROM otp_attempts 
  WHERE user_identifier = p_identifier;
  
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check if locked out
  IF is_user_locked_out(p_identifier) THEN
    RETURN FALSE;
  END IF;
  
  -- Check cooldown (60 seconds since last attempt)
  IF attempt_record.last_attempt > NOW() - INTERVAL '60 seconds' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on otp_attempts table
ALTER TABLE otp_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own OTP attempts (for debugging)
CREATE POLICY "Users can view own OTP attempts" ON otp_attempts
  FOR SELECT USING (user_identifier = auth.jwt() ->> 'email' OR user_identifier = auth.jwt() ->> 'phone');

-- ============================================
-- CLEANUP FUNCTION
-- ============================================

-- Function to clean up old OTP attempt records
CREATE OR REPLACE FUNCTION cleanup_old_otp_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM otp_attempts 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE otp_attempts IS 'Tracks OTP attempts to prevent brute force attacks';
COMMENT ON FUNCTION is_user_locked_out(TEXT) IS 'Checks if user is currently locked out due to too many failed OTP attempts';
COMMENT ON FUNCTION record_otp_attempt(TEXT, BOOLEAN) IS 'Records an OTP attempt and returns whether user should be locked out';
COMMENT ON FUNCTION can_request_otp(TEXT) IS 'Checks if user can request a new OTP (not locked out and cooldown period passed)';
COMMENT ON FUNCTION cleanup_old_otp_attempts() IS 'Removes OTP attempt records older than 7 days';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created OTP security tables and functions';
  RAISE NOTICE '✅ Implemented 3-attempt lockout with 15-minute duration';
  RAISE NOTICE '✅ Added 60-second cooldown between OTP requests';
  RAISE NOTICE '✅ Added cleanup function for old records';
  RAISE NOTICE '📝 Migration 0066 complete - OTP security enhanced';
END$$;
