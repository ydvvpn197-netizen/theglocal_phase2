-- Fix Handle Reservations Foreign Key
-- Version: 0099
-- Description: Remove FK constraint from handle_reservations.user_id since user doesn't exist yet
-- Date: 2025-10-31

SET search_path TO public;

-- ============================================
-- FIX HANDLE_RESERVATIONS FOREIGN KEY
-- ============================================

-- Drop the FK constraint on user_id since the user doesn't exist yet during signup
ALTER TABLE handle_reservations 
DROP CONSTRAINT IF EXISTS handle_reservations_user_id_fkey;

-- Keep the column but make it nullable so we can still track which user reserved it
ALTER TABLE handle_reservations 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a comment explaining the purpose
COMMENT ON COLUMN handle_reservations.user_id IS 
  'User ID from auth.users - nullable during reservation phase, populated after OTP verification';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Removed FK constraint from handle_reservations.user_id';
  RAISE NOTICE '✅ Handle reservations can now be created before user exists in public.users';
  RAISE NOTICE '📝 Migration 0099 complete - handle reservations FK fixed';
END$$;

