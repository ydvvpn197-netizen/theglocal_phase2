-- Fix OTP ON CONFLICT Error
-- Version: 0096
-- Description: Add UNIQUE constraint on user_identifier to fix ON CONFLICT error in record_otp_attempt function
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- FIX OTP ATTEMPTS TABLE CONSTRAINT
-- ============================================

-- Drop the existing regular index
DROP INDEX IF EXISTS idx_otp_attempts_user_identifier;

-- Handle any potential duplicate data (keep the most recent record per user_identifier)
-- This should be safe as the table is new and unlikely to have duplicates
WITH duplicate_records AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_identifier 
      ORDER BY created_at DESC, id DESC
    ) as row_num
  FROM otp_attempts
)
DELETE FROM otp_attempts
WHERE id IN (
  SELECT id FROM duplicate_records WHERE row_num > 1
);

-- Create UNIQUE index on user_identifier
-- This will enable ON CONFLICT (user_identifier) to work properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_attempts_user_identifier_unique 
ON otp_attempts(user_identifier);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  -- Verify the unique constraint exists
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_otp_attempts_user_identifier_unique'
    AND tablename = 'otp_attempts'
  ) THEN
    RAISE NOTICE '✅ Created unique index on user_identifier';
    RAISE NOTICE '✅ ON CONFLICT (user_identifier) will now work in record_otp_attempt function';
    RAISE NOTICE '📝 Migration 0096 complete - OTP ON CONFLICT error fixed';
  ELSE
    RAISE EXCEPTION 'Failed to create unique index on user_identifier';
  END IF;
END$$;
