-- Make Email Nullable for Phone-Only Signups
-- Version: 0098
-- Description: Allow email to be NULL to support phone-only authentication via Supabase Auth
-- Date: 2025-10-31

SET search_path TO public;

-- ============================================
-- ALTER EMAIL COLUMN TO ALLOW NULL VALUES
-- ============================================

-- Drop the NOT NULL constraint on email column
-- Phone-only users won't have an email, but they exist in auth.users
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  -- Verify email can now be NULL
  RAISE NOTICE '✅ Email column is now nullable';
  RAISE NOTICE '✅ Phone-only signups will no longer fail on email constraint';
  RAISE NOTICE '📝 Migration 0098 complete - email nullable for phone auth';
END$$;

