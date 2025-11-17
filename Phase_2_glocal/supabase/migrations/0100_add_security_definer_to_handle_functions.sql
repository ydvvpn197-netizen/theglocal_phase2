-- Add SECURITY DEFINER to Handle Reservation Functions
-- Version: 0100
-- Description: Make handle reservation functions SECURITY DEFINER to bypass RLS
-- Date: 2025-10-31

SET search_path TO public;

-- ============================================
-- UPDATE FUNCTIONS WITH SECURITY DEFINER
-- ============================================

-- Make reserve_handle run as superuser to bypass RLS
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make release_handle_reservation run as superuser
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make is_handle_available run as superuser for consistency
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make generate_unique_handle run as superuser
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make finalize_handle_reservation run as superuser
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Added SECURITY DEFINER to all handle reservation functions';
  RAISE NOTICE '✅ Functions can now bypass RLS for handle reservations';
  RAISE NOTICE '📝 Migration 0100 complete - handle functions security updated';
END$$;

