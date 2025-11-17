-- ============================================
-- SETUP SUPER ADMIN ACCOUNT
-- ============================================
-- Set up super admin privileges for vipin@theglocal.in
-- Migration is idempotent - safe to run multiple times
-- Version: 0094
-- Description: Setup super admin account for platform administration
-- Date: 2025-01-29

-- ============================================
-- SET SUPER ADMIN FLAG
-- ============================================

-- Update users table to set is_super_admin = TRUE for the specified email
-- This will only affect the user if they exist (no-op if user doesn't exist yet)
UPDATE users
SET is_super_admin = TRUE,
    updated_at = NOW()
WHERE email = 'vipin@theglocal.in'
  AND is_super_admin IS DISTINCT FROM TRUE;

-- Log the result
DO $$
DECLARE
    updated_count INTEGER;
    user_exists BOOLEAN;
    user_id_val UUID;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'vipin@theglocal.in') INTO user_exists;
    SELECT id INTO user_id_val FROM users WHERE email = 'vipin@theglocal.in' LIMIT 1;
    
    IF user_exists THEN
        RAISE NOTICE '✅ Super admin flag set for user: vipin@theglocal.in (ID: %)', user_id_val;
    ELSE
        RAISE NOTICE '⚠️  User vipin@theglocal.in does not exist yet. Run this migration after account creation.';
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Create a view to verify super admin status (optional, for debugging)
CREATE OR REPLACE VIEW super_admins AS
SELECT 
    id,
    email,
    anonymous_handle,
    is_super_admin,
    created_at
FROM users
WHERE is_super_admin = TRUE;

-- Add comment to the view
COMMENT ON VIEW super_admins IS 'View of all super admin users for verification';

-- ============================================
-- NOTES
-- ============================================
-- 1. This migration sets the database flag only
-- 2. Also add vipin@theglocal.in to SUPER_ADMIN_EMAILS environment variable
-- 3. Super admin check in lib/utils/permissions.ts checks both:
--    - Database flag (is_super_admin column)
--    - Environment variable (SUPER_ADMIN_EMAILS)
-- 4. Account must be created first via signup flow before running this migration
-- 5. Migration is idempotent - safe to run multiple times

