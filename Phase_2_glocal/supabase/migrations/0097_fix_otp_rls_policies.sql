-- Fix OTP RLS Policies
-- Version: 0097
-- Description: Add SECURITY DEFINER to OTP functions to bypass RLS for security operations
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- UPDATE OTP FUNCTIONS TO BYPASS RLS
-- ============================================

-- Function to check if user is locked out
-- Uses SECURITY DEFINER to bypass RLS for system-level security checks
CREATE OR REPLACE FUNCTION is_user_locked_out(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to record OTP attempt
-- Uses SECURITY DEFINER to bypass RLS for system-level security operations
CREATE OR REPLACE FUNCTION record_otp_attempt(
  p_identifier TEXT,
  p_success BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to check cooldown period (60 seconds between OTP requests)
-- Uses SECURITY DEFINER to bypass RLS for system-level security checks
CREATE OR REPLACE FUNCTION can_request_otp(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to clean up old OTP attempt records
-- Uses SECURITY DEFINER to bypass RLS for system-level cleanup operations
CREATE OR REPLACE FUNCTION cleanup_old_otp_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM otp_attempts 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Updated OTP functions with SECURITY DEFINER';
  RAISE NOTICE '✅ Functions can now bypass RLS for security operations';
  RAISE NOTICE '✅ record_otp_attempt can insert/update OTP attempts';
  RAISE NOTICE '✅ is_user_locked_out and can_request_otp can check lockout status';
  RAISE NOTICE '✅ cleanup_old_otp_attempts can delete old records';
  RAISE NOTICE '📝 Migration 0097 complete - OTP RLS policies fixed';
END$$;

