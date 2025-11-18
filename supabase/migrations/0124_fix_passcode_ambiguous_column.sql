-- ============================================
-- FIX AMBIGUOUS COLUMN REFERENCE IN PASSCODE FUNCTIONS
-- ============================================
-- This migration fixes the "column reference 'passcode_id' is ambiguous" error
-- by explicitly qualifying column references and using constraint names in ON CONFLICT

-- Fix validate_artist_passcode function to explicitly qualify columns
CREATE OR REPLACE FUNCTION validate_artist_passcode(
  p_passcode TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  passcode_id UUID,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_passcode_record artist_passcodes%ROWTYPE;
  v_usage_count INTEGER;
  v_user_used BOOLEAN;
BEGIN
  -- Find the passcode (case-insensitive comparison)
  SELECT * INTO v_passcode_record
  FROM artist_passcodes
  WHERE UPPER(TRIM(artist_passcodes.passcode)) = UPPER(TRIM(p_passcode));

  -- Check if passcode exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid passcode'::TEXT;
    RETURN;
  END IF;

  -- Check if passcode is active
  IF NOT v_passcode_record.is_active THEN
    RETURN QUERY SELECT false, v_passcode_record.id, 'Passcode is no longer active'::TEXT;
    RETURN;
  END IF;

  -- Check if passcode has expired
  IF v_passcode_record.expires_at IS NOT NULL AND v_passcode_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_passcode_record.id, 'Passcode has expired'::TEXT;
    RETURN;
  END IF;

  -- Check if passcode has reached max uses
  IF v_passcode_record.max_uses IS NOT NULL AND v_passcode_record.current_uses >= v_passcode_record.max_uses THEN
    RETURN QUERY SELECT false, v_passcode_record.id, 'Passcode has reached maximum uses'::TEXT;
    RETURN;
  END IF;

  -- Check if user has already used this passcode (explicitly qualify columns)
  SELECT EXISTS (
    SELECT 1 FROM artist_passcode_usage apu
    WHERE apu.passcode_id = v_passcode_record.id
    AND apu.user_id = p_user_id
  ) INTO v_user_used;

  IF v_user_used THEN
    RETURN QUERY SELECT false, v_passcode_record.id, 'You have already used this passcode'::TEXT;
    RETURN;
  END IF;

  -- Passcode is valid
  RETURN QUERY SELECT true, v_passcode_record.id, 'Passcode is valid'::TEXT;
END;
$$;

-- Fix record_passcode_usage function to use explicit constraint name in ON CONFLICT
CREATE OR REPLACE FUNCTION record_passcode_usage(
  p_passcode_id UUID,
  p_artist_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_exists BOOLEAN := false;
BEGIN
  -- Check if this usage already exists
  SELECT EXISTS (
    SELECT 1 FROM artist_passcode_usage apu
    WHERE apu.passcode_id = p_passcode_id
    AND apu.user_id = p_user_id
  ) INTO v_already_exists;

  -- Only insert and increment if it doesn't already exist
  IF NOT v_already_exists THEN
    -- Record the usage
    INSERT INTO artist_passcode_usage (passcode_id, artist_id, user_id)
    VALUES (p_passcode_id, p_artist_id, p_user_id)
    ON CONFLICT ON CONSTRAINT artist_passcode_usage_passcode_id_user_id_key DO NOTHING;

    -- Increment usage count
    UPDATE artist_passcodes
    SET current_uses = current_uses + 1,
        updated_at = NOW()
    WHERE artist_passcodes.id = p_passcode_id;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_artist_passcode(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_artist_passcode(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION record_passcode_usage(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_passcode_usage(UUID, UUID, UUID) TO anon;

-- Verify functions are updated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'validate_artist_passcode'
    AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Function validate_artist_passcode does not exist';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'record_passcode_usage'
    AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Function record_passcode_usage does not exist';
  END IF;
  
  RAISE NOTICE 'Passcode functions updated successfully';
END $$;

