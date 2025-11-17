-- ============================================
-- VERIFY PASSCODE SETUP
-- ============================================
-- This migration verifies that passcodes are set up correctly

-- Check if passcodes exist
DO $$
DECLARE
  passcode_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO passcode_count FROM artist_passcodes;
  
  IF passcode_count = 0 THEN
    RAISE WARNING 'No passcodes found in artist_passcodes table';
    -- Re-insert passcodes
    INSERT INTO artist_passcodes (passcode, description, is_active, max_uses, expires_at) VALUES
      ('ARTIST2024', 'Early Bird 2024 Promotion', true, 100, NULL),
      ('WELCOME50', 'Welcome Promotion - 50 Uses', true, 50, NULL),
      ('LAUNCH100', 'Platform Launch Special', true, NULL, '2025-12-31 23:59:59+00'::TIMESTAMPTZ)
    ON CONFLICT (passcode) DO NOTHING;
    RAISE NOTICE 'Passcodes re-inserted';
  ELSE
    RAISE NOTICE 'Found % passcodes in database', passcode_count;
  END IF;
END $$;

-- Verify functions exist and have correct permissions
DO $$
BEGIN
  -- Check validate_artist_passcode
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'validate_artist_passcode'
    AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Function validate_artist_passcode does not exist';
  END IF;
  
  -- Check record_passcode_usage
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'record_passcode_usage'
    AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Function record_passcode_usage does not exist';
  END IF;
  
  RAISE NOTICE 'All passcode functions verified';
END $$;

-- Ensure execute permissions are granted
GRANT EXECUTE ON FUNCTION validate_artist_passcode(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_artist_passcode(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION record_passcode_usage(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_passcode_usage(UUID, UUID, UUID) TO anon;

-- Display current passcodes for verification
SELECT 
  passcode,
  description,
  is_active,
  current_uses,
  max_uses,
  expires_at
FROM artist_passcodes
ORDER BY passcode;

