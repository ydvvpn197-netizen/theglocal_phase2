-- ============================================
-- ARTIST PASSCODES TABLE
-- ============================================
-- This table stores discount/promotional passcodes for artist verification
-- Users with valid passcodes can skip payment and get verified directly

CREATE TABLE IF NOT EXISTS artist_passcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passcode TEXT NOT NULL UNIQUE,
  description TEXT, -- Optional description for the passcode (e.g., "Early Bird", "Promo 2024")
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER, -- NULL means unlimited uses
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ, -- NULL means never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PASSCODE USAGE TRACKING TABLE
-- ============================================
-- Track which users have used which passcodes to prevent reuse

CREATE TABLE IF NOT EXISTS artist_passcode_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passcode_id UUID NOT NULL REFERENCES artist_passcodes(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(passcode_id, user_id) -- Prevent same user from using same passcode twice
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_artist_passcodes_passcode ON artist_passcodes(passcode);
CREATE INDEX IF NOT EXISTS idx_artist_passcodes_active ON artist_passcodes(is_active);
CREATE INDEX IF NOT EXISTS idx_artist_passcode_usage_passcode_id ON artist_passcode_usage(passcode_id);
CREATE INDEX IF NOT EXISTS idx_artist_passcode_usage_user_id ON artist_passcode_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_passcode_usage_artist_id ON artist_passcode_usage(artist_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE artist_passcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_passcode_usage ENABLE ROW LEVEL SECURITY;

-- Passcodes: Only admins can view/manage, but anyone can check if a passcode is valid (via function)
CREATE POLICY "Admins can view all passcodes"
  ON artist_passcodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = TRUE OR users.is_super_admin = TRUE)
    )
  );

CREATE POLICY "Admins can insert passcodes"
  ON artist_passcodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = TRUE OR users.is_super_admin = TRUE)
    )
  );

CREATE POLICY "Admins can update passcodes"
  ON artist_passcodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = TRUE OR users.is_super_admin = TRUE)
    )
  );

-- Passcode usage: Users can view their own usage
CREATE POLICY "Users can view their own passcode usage"
  ON artist_passcode_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert passcode usage"
  ON artist_passcode_usage FOR INSERT
  WITH CHECK (true); -- Allow system to track usage

-- ============================================
-- FUNCTION: Validate and use passcode
-- ============================================
-- This function validates a passcode and returns whether it can be used
-- It checks: active status, expiration, max uses, and if user already used it

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
  WHERE UPPER(TRIM(passcode)) = UPPER(TRIM(p_passcode));

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

  -- Check if user has already used this passcode
  SELECT EXISTS (
    SELECT 1 FROM artist_passcode_usage
    WHERE passcode_id = v_passcode_record.id
    AND user_id = p_user_id
  ) INTO v_user_used;

  IF v_user_used THEN
    RETURN QUERY SELECT false, v_passcode_record.id, 'You have already used this passcode'::TEXT;
    RETURN;
  END IF;

  -- Passcode is valid
  RETURN QUERY SELECT true, v_passcode_record.id, 'Passcode is valid'::TEXT;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_artist_passcode TO authenticated;
GRANT EXECUTE ON FUNCTION validate_artist_passcode TO anon;

-- ============================================
-- FUNCTION: Record passcode usage
-- ============================================
-- Records that a passcode was used and increments the usage count

CREATE OR REPLACE FUNCTION record_passcode_usage(
  p_passcode_id UUID,
  p_artist_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Record the usage
  INSERT INTO artist_passcode_usage (passcode_id, artist_id, user_id)
  VALUES (p_passcode_id, p_artist_id, p_user_id)
  ON CONFLICT (passcode_id, user_id) DO NOTHING;

  -- Increment usage count
  UPDATE artist_passcodes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = p_passcode_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION record_passcode_usage TO authenticated;
GRANT EXECUTE ON FUNCTION record_passcode_usage TO anon;

-- ============================================
-- INITIAL PASSCODES
-- ============================================
-- Create 3 promotional passcodes for onboarding artists

INSERT INTO artist_passcodes (passcode, description, is_active, max_uses, expires_at) VALUES
  ('ARTIST2024', 'Early Bird 2024 Promotion', true, 100, NULL),
  ('WELCOME50', 'Welcome Promotion - 50 Uses', true, 50, NULL),
  ('LAUNCH100', 'Platform Launch Special', true, NULL, '2025-12-31 23:59:59+00'::TIMESTAMPTZ)
ON CONFLICT (passcode) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE artist_passcodes IS 'Stores promotional passcodes for artist verification that allow skipping payment';
COMMENT ON TABLE artist_passcode_usage IS 'Tracks which users have used which passcodes to prevent reuse';
COMMENT ON FUNCTION validate_artist_passcode IS 'Validates a passcode and checks if it can be used by the given user';
COMMENT ON FUNCTION record_passcode_usage IS 'Records passcode usage and increments the usage counter';

