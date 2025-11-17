-- Fix Users Insert Policy
-- Version: 0026
-- Description: Ensure users table has proper INSERT policy for new user creation
-- Date: 2025-10-13

-- ============================================
-- ADD USERS INSERT POLICY
-- ============================================

-- Drop existing policy if it exists to make this migration idempotent
DROP POLICY IF EXISTS "Users can create own profile" ON users;

-- Allow authenticated users to insert their own profile
-- This is needed for the verify-otp endpoint to create user profiles
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can create own profile" ON users IS 
  'Allows authenticated users to create their own profile in the users table after signup';

