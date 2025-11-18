-- Anonymous Handle Collision Prevention
-- Version: 0068
-- Description: Add unique index and collision prevention for anonymous handles
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- UNIQUE INDEX ON ANONYMOUS HANDLE
-- ============================================

-- Create unique index on anonymous_handle to prevent collisions
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_anonymous_handle_unique 
ON users(anonymous_handle);

-- ============================================
-- HANDLE RESERVATION TABLE
-- ============================================

-- Table to temporarily reserve handles during high-concurrency scenarios
CREATE TABLE IF NOT EXISTS handle_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL UNIQUE,
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_handle_reservations_expires 
ON handle_reservations(expires_at);

-- ============================================
-- HANDLE COLLISION PREVENTION FUNCTIONS
-- ============================================

-- Function to reserve a handle temporarily
CREATE OR REPLACE FUNCTION reserve_handle(
  p_handle TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  reservation_id UUID;
BEGIN
  -- Clean up expired reservations first
  DELETE FROM handle_reservations 
  WHERE expires_at < NOW();
  
  -- Try to insert reservation
  INSERT INTO handle_reservations (handle, user_id)
  VALUES (p_handle, p_user_id)
  RETURNING id INTO reservation_id;
  
  RETURN reservation_id IS NOT NULL;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to release a handle reservation
CREATE OR REPLACE FUNCTION release_handle_reservation(
  p_handle TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM handle_reservations 
  WHERE handle = p_handle AND user_id = p_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to check if handle is available
CREATE OR REPLACE FUNCTION is_handle_available(p_handle TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_exists BOOLEAN;
  reservation_exists BOOLEAN;
BEGIN
  -- Check if handle exists in users table
  SELECT EXISTS(
    SELECT 1 FROM users WHERE anonymous_handle = p_handle
  ) INTO user_exists;
  
  IF user_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check if handle is reserved
  SELECT EXISTS(
    SELECT 1 FROM handle_reservations 
    WHERE handle = p_handle AND expires_at > NOW()
  ) INTO reservation_exists;
  
  RETURN NOT reservation_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique handle with collision detection
CREATE OR REPLACE FUNCTION generate_unique_handle(
  p_user_id UUID,
  p_max_attempts INTEGER DEFAULT 5
)
RETURNS TEXT AS $$
DECLARE
  base_handle TEXT;
  handle_suffix TEXT;
  full_handle TEXT;
  attempt INTEGER := 0;
  is_available BOOLEAN;
  reserved BOOLEAN;
BEGIN
  -- Generate base handle (this should be done in application code)
  -- For now, we'll assume the base handle is passed or generated externally
  
  LOOP
    attempt := attempt + 1;
    
    -- Generate handle with higher entropy (12-digit suffix)
    handle_suffix := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
    full_handle := 'LocalUser' || handle_suffix;
    
    -- Check if handle is available
    SELECT is_handle_available(full_handle) INTO is_available;
    
    IF is_available THEN
      -- Try to reserve the handle
      SELECT reserve_handle(full_handle, p_user_id) INTO reserved;
      
      IF reserved THEN
        RETURN full_handle;
      END IF;
    END IF;
    
    -- Exit if max attempts reached
    IF attempt >= p_max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique handle after % attempts', p_max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize handle reservation (move from reservation to users table)
CREATE OR REPLACE FUNCTION finalize_handle_reservation(
  p_handle TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  reservation_exists BOOLEAN;
BEGIN
  -- Check if reservation exists and is valid
  SELECT EXISTS(
    SELECT 1 FROM handle_reservations 
    WHERE handle = p_handle 
    AND user_id = p_user_id 
    AND expires_at > NOW()
  ) INTO reservation_exists;
  
  IF NOT reservation_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Remove reservation (handle will be used in users table)
  DELETE FROM handle_reservations 
  WHERE handle = p_handle AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean up expired handle reservations
CREATE OR REPLACE FUNCTION cleanup_expired_handle_reservations()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  DELETE FROM handle_reservations 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on handle_reservations table
ALTER TABLE handle_reservations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reservations
CREATE POLICY "Users can view own handle reservations" ON handle_reservations
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own reservations
CREATE POLICY "Users can create own handle reservations" ON handle_reservations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own reservations
CREATE POLICY "Users can delete own handle reservations" ON handle_reservations
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to clean up expired reservations periodically
CREATE OR REPLACE FUNCTION trigger_cleanup_handle_reservations()
RETURNS TRIGGER AS $$
BEGIN
  -- Run cleanup if this is a new reservation
  IF TG_OP = 'INSERT' THEN
    PERFORM cleanup_expired_handle_reservations();
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_handle_reservations_trigger
  AFTER INSERT ON handle_reservations
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_handle_reservations();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE handle_reservations IS 'Temporarily reserves anonymous handles during high-concurrency user creation';
COMMENT ON FUNCTION reserve_handle(TEXT, UUID) IS 'Reserves a handle temporarily to prevent collisions during user creation';
COMMENT ON FUNCTION is_handle_available(TEXT) IS 'Checks if a handle is available (not in use and not reserved)';
COMMENT ON FUNCTION generate_unique_handle(UUID, INTEGER) IS 'Generates a unique handle with collision detection and reservation';
COMMENT ON FUNCTION finalize_handle_reservation(TEXT, UUID) IS 'Finalizes a handle reservation by removing it from reservations table';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created unique index on anonymous_handle';
  RAISE NOTICE '✅ Added handle reservation system for high-concurrency scenarios';
  RAISE NOTICE '✅ Implemented collision detection with max 5 retry attempts';
  RAISE NOTICE '✅ Added 12-digit suffix for higher entropy';
  RAISE NOTICE '📝 Migration 0068 complete - handle collision prevention enhanced';
END$$;
