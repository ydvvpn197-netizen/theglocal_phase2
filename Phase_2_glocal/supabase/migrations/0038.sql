-- Ensure Archived Community Migration
-- Version: 0038
-- Description: Ensure system user and archived community exist for community deletion
-- Date: 2025-01-27

-- ============================================
-- ENSURE SYSTEM USER EXISTS
-- ============================================

-- Create system user if it doesn't exist
-- Use ON CONFLICT to handle case where user already exists
INSERT INTO users (
  id,
  email,
  anonymous_handle,
  avatar_seed,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system@theglocal.in',
  'system',
  'system-seed',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  anonymous_handle = EXCLUDED.anonymous_handle,
  avatar_seed = EXCLUDED.avatar_seed,
  updated_at = NOW();

-- ============================================
-- ENSURE ARCHIVED COMMUNITY EXISTS
-- ============================================

-- Create "Archived Communities" system community if it doesn't exist
INSERT INTO communities (
  id,
  name,
  slug,
  description,
  location_city,
  created_by,
  is_private,
  is_featured,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Archived Communities',
  'archived-communities',
  'Posts from deleted communities are preserved here for historical reference.',
  'System',
  '00000000-0000-0000-0000-000000000000'::uuid,
  true, -- Private by default
  false,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  location_city = EXCLUDED.location_city,
  created_by = EXCLUDED.created_by,
  is_private = EXCLUDED.is_private,
  is_featured = EXCLUDED.is_featured,
  updated_at = NOW();

-- ============================================
-- UPDATE SOFT DELETE FUNCTION
-- ============================================

-- Drop and recreate the soft_delete_community function with auto-creation
DROP FUNCTION IF EXISTS soft_delete_community(UUID, UUID);

CREATE OR REPLACE FUNCTION soft_delete_community(
  community_id_param UUID, 
  user_id_param UUID
)
RETURNS JSON 
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
  community_record RECORD;
  archived_community_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  posts_transferred INTEGER := 0;
  deletion_time TIMESTAMPTZ := NOW();
  scheduled_deletion TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
BEGIN
  -- Get the community details
  SELECT * INTO community_record 
  FROM communities 
  WHERE id = community_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Community not found');
  END IF;
  
  IF community_record.is_deleted THEN
    RETURN json_build_object('success', false, 'error', 'Community already deleted');
  END IF;
  
  -- Ensure system user exists
  INSERT INTO users (
    id, email, anonymous_handle, avatar_seed, created_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'system@theglocal.in',
    'system',
    'system-seed',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Ensure archived community exists
  INSERT INTO communities (
    id, name, slug, description, location_city, created_by, is_private, is_featured, created_at
  )
  VALUES (
    archived_community_id,
    'Archived Communities',
    'archived-communities',
    'Posts from deleted communities are preserved here for historical reference.',
    'System',
    '00000000-0000-0000-0000-000000000000'::uuid,
    true,
    false,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Verify archived community exists after creation attempt
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = archived_community_id) THEN
    RETURN json_build_object('success', false, 'error', 'Failed to create archived community');
  END IF;
  
  -- Transfer all posts to archived community
  UPDATE posts 
  SET 
    community_id = archived_community_id,
    updated_at = NOW()
  WHERE community_id = community_id_param AND is_deleted = FALSE;
  
  GET DIAGNOSTICS posts_transferred = ROW_COUNT;
  
  -- Mark community as deleted
  UPDATE communities 
  SET 
    is_deleted = TRUE,
    deleted_at = deletion_time,
    deleted_by = user_id_param,
    deletion_scheduled_for = scheduled_deletion,
    updated_at = NOW()
  WHERE id = community_id_param;
  
  RETURN json_build_object(
    'success', true,
    'deleted_at', deletion_time,
    'scheduled_deletion', scheduled_deletion,
    'posts_transferred', posts_transferred
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'System error: ' || SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION soft_delete_community(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_community(UUID, UUID) TO service_role;

-- ============================================
-- ADD VERIFICATION FUNCTION
-- ============================================

-- Function to verify system data exists
CREATE OR REPLACE FUNCTION verify_system_data()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  system_user_exists BOOLEAN;
  archived_community_exists BOOLEAN;
  system_user_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
  archived_community_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Check if system user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = system_user_id) INTO system_user_exists;
  
  -- Check if archived community exists
  SELECT EXISTS(SELECT 1 FROM communities WHERE id = archived_community_id) INTO archived_community_exists;
  
  RETURN json_build_object(
    'success', system_user_exists AND archived_community_exists,
    'system_user_exists', system_user_exists,
    'archived_community_exists', archived_community_exists,
    'system_user_id', system_user_id,
    'archived_community_id', archived_community_id
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION verify_system_data() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_system_data() TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION soft_delete_community(UUID, UUID) IS 
  'Soft deletes a community with auto-creation of system data if missing';

COMMENT ON FUNCTION verify_system_data() IS 
  'Verifies that system user and archived community exist';
