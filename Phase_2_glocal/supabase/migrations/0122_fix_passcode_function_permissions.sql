-- ============================================
-- FIX PASSCODE FUNCTION PERMISSIONS
-- ============================================
-- This migration fixes permissions and ensures the passcode validation function works correctly

-- Grant execute permissions (if not already granted)
GRANT EXECUTE ON FUNCTION validate_artist_passcode(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_artist_passcode(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION record_passcode_usage(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_passcode_usage(UUID, UUID, UUID) TO anon;

-- Ensure passcodes exist (re-insert if they don't exist)
INSERT INTO artist_passcodes (passcode, description, is_active, max_uses, expires_at) VALUES
  ('ARTIST2024', 'Early Bird 2024 Promotion', true, 100, NULL),
  ('WELCOME50', 'Welcome Promotion - 50 Uses', true, 50, NULL),
  ('LAUNCH100', 'Platform Launch Special', true, NULL, '2025-12-31 23:59:59+00'::TIMESTAMPTZ)
ON CONFLICT (passcode) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description,
  max_uses = EXCLUDED.max_uses,
  expires_at = EXCLUDED.expires_at;

-- Add a policy to allow the function to read passcodes (via SECURITY DEFINER, but just in case)
-- Actually, SECURITY DEFINER should bypass RLS, but let's ensure the function can access the table
-- by making sure the function owner has proper permissions

-- Verify the functions exist and are accessible
DO $$
BEGIN
  -- Check if validate_artist_passcode exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'validate_artist_passcode'
  ) THEN
    RAISE EXCEPTION 'Function validate_artist_passcode does not exist';
  END IF;
  
  -- Check if record_passcode_usage exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'record_passcode_usage'
  ) THEN
    RAISE EXCEPTION 'Function record_passcode_usage does not exist';
  END IF;
  
  RAISE NOTICE 'All passcode functions verified';
END $$;

