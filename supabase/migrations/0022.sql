-- Community Deletion System Migration
-- Version: 0022
-- Description: Add soft delete functionality with 24-hour recovery period and orphaned posts handling
-- Date: 2025-01-27

-- ============================================
-- ADD DELETION TRACKING FIELDS TO COMMUNITIES
-- ============================================

ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_communities_deletion_scheduled ON communities(deletion_scheduled_for) 
WHERE is_deleted = TRUE;

-- ============================================
-- CREATE SYSTEM USER (FOR SYSTEM-OWNED RECORDS)
-- ============================================

-- Ensure a system user exists so system-owned communities/posts can reference a valid user id.
-- Insert required NOT NULL columns (avatar_seed) to satisfy constraints.
INSERT INTO users (id, email, anonymous_handle, avatar_seed, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system@local',
  'system',
  'system-seed',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Optionally, you may want to set flags on the system user (e.g., is_super_admin)
-- UPDATE users SET is_super_admin = true WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- ============================================
-- CREATE ARCHIVED COMMUNITIES SYSTEM COMMUNITY
-- ============================================

-- Insert the special "Archived Communities" community if it doesn't exist
INSERT INTO communities (
  id,
  name,
  slug,
  description,
  location_city,
  created_by,
  is_private,
  is_featured
) 
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Archived Communities',
  'archived-communities',
  'Posts from deleted communities are preserved here for historical reference.',
  'System',
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user ID
  true, -- Private by default
  false
WHERE NOT EXISTS (
  SELECT 1 FROM communities WHERE slug = 'archived-communities'
);

-- ============================================
-- CREATE DELETION HELPER FUNCTIONS
-- ============================================

-- Function to soft delete a community
CREATE OR REPLACE FUNCTION soft_delete_community(community_id_param UUID, user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  community_record RECORD;
  archived_community_id UUID;
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
  
  -- Get the archived community ID
  SELECT id INTO archived_community_id 
  FROM communities 
  WHERE slug = 'archived-communities';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Archived community not found');
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
END;
$$ LANGUAGE plpgsql;

-- Function to permanently delete a community
CREATE OR REPLACE FUNCTION permanently_delete_community(community_id_param UUID)
RETURNS JSON AS $$
DECLARE
  community_record RECORD;
  deleted_members INTEGER := 0;
  deleted_rules INTEGER := 0;
  deleted_invites INTEGER := 0;
  deleted_requests INTEGER := 0;
BEGIN
  -- Get the community details
  SELECT * INTO community_record 
  FROM communities 
  WHERE id = community_id_param AND is_deleted = TRUE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Community not found or not deleted');
  END IF;
  
  -- Delete community members
  DELETE FROM community_members WHERE community_id = community_id_param;
  GET DIAGNOSTICS deleted_members = ROW_COUNT;
  
  -- Delete community rules
  DELETE FROM community_rules WHERE community_id = community_id_param;
  GET DIAGNOSTICS deleted_rules = ROW_COUNT;
  
  -- Delete community invites
  DELETE FROM community_invites WHERE community_id = community_id_param;
  GET DIAGNOSTICS deleted_invites = ROW_COUNT;
  
  -- Delete community join requests
  DELETE FROM community_join_requests WHERE community_id = community_id_param;
  GET DIAGNOSTICS deleted_requests = ROW_COUNT;
  
  -- Delete the community itself
  DELETE FROM communities WHERE id = community_id_param;
  
  RETURN json_build_object(
    'success', true,
    'deleted_members', deleted_members,
    'deleted_rules', deleted_rules,
    'deleted_invites', deleted_invites,
    'deleted_requests', deleted_requests
  );
END;
$$ LANGUAGE plpgsql;

-- Function to restore a deleted community
CREATE OR REPLACE FUNCTION restore_deleted_community(community_id_param UUID)
RETURNS JSON AS $$
DECLARE
  community_record RECORD;
  archived_community_id UUID;
  posts_restored INTEGER := 0;
BEGIN
  -- Get the community details
  SELECT * INTO community_record 
  FROM communities 
  WHERE id = community_id_param AND is_deleted = TRUE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Community not found or not deleted');
  END IF;
  
  -- Check if still within recovery window
  IF community_record.deletion_scheduled_for < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Recovery window has expired');
  END IF;
  
  -- Get the archived community ID
  SELECT id INTO archived_community_id 
  FROM communities 
  WHERE slug = 'archived-communities';
  
  -- Transfer posts back from archived community
  UPDATE posts 
  SET 
    community_id = community_id_param,
    updated_at = NOW()
  WHERE community_id = archived_community_id 
    AND body LIKE '%[Archived from: ' || community_record.name || ']%';
  
  GET DIAGNOSTICS posts_restored = ROW_COUNT;
  
  -- Restore the community
  UPDATE communities 
  SET 
    is_deleted = FALSE,
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_scheduled_for = NULL,
    updated_at = NOW()
  WHERE id = community_id_param;
  
  RETURN json_build_object(
    'success', true,
    'posts_restored', posts_restored
  );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired deleted communities
CREATE OR REPLACE FUNCTION cleanup_expired_deleted_communities()
RETURNS JSON AS $$
DECLARE
  expired_community RECORD;
  total_deleted INTEGER := 0;
  result JSON;
BEGIN
  -- Find communities past their deletion window
  FOR expired_community IN 
    SELECT id, name 
    FROM communities 
    WHERE is_deleted = TRUE 
      AND deletion_scheduled_for < NOW()
  LOOP
    -- Permanently delete the community
    SELECT permanently_delete_community(expired_community.id) INTO result;
    
    IF (result->>'success')::boolean THEN
      total_deleted := total_deleted + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'communities_deleted', total_deleted
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE POSTS FOR ARCHIVED COMMUNITY INDICATOR
-- ============================================

-- Function to add archive indicator to posts when transferring
CREATE OR REPLACE FUNCTION add_archive_indicator_to_post()
RETURNS TRIGGER AS $$
DECLARE
  original_community_name TEXT;
BEGIN
  -- If moving to archived community, add indicator to body
  IF NEW.community_id = (SELECT id FROM communities WHERE slug = 'archived-communities') THEN
    -- Get the original community name from the posts table
    SELECT name INTO original_community_name 
    FROM communities 
    WHERE id = OLD.community_id;
    
    -- Add archive indicator if not already present
    IF NEW.body NOT LIKE '%[Archived from:%' THEN
      NEW.body := COALESCE(NEW.body, '') || E'\n\n[Archived from: ' || original_community_name || ']';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for adding archive indicators
DROP TRIGGER IF EXISTS add_archive_indicator_trigger ON posts;
CREATE TRIGGER add_archive_indicator_trigger
  BEFORE UPDATE ON posts
  FOR EACH ROW
  WHEN (OLD.community_id IS DISTINCT FROM NEW.community_id)
  EXECUTE FUNCTION add_archive_indicator_to_post();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION soft_delete_community IS 'Soft deletes a community, transferring posts to archived community and scheduling permanent deletion';
COMMENT ON FUNCTION permanently_delete_community IS 'Permanently deletes a community and all related data except posts';
COMMENT ON FUNCTION restore_deleted_community IS 'Restores a soft-deleted community within the 24-hour window';
COMMENT ON FUNCTION cleanup_expired_deleted_communities IS 'Cleanup function for cron job to permanently delete expired communities';
COMMENT ON COLUMN communities.is_deleted IS 'Whether the community has been soft deleted';
COMMENT ON COLUMN communities.deleted_at IS 'When the community was soft deleted';
COMMENT ON COLUMN communities.deleted_by IS 'User who deleted the community';
COMMENT ON COLUMN communities.deletion_scheduled_for IS 'When the community will be permanently deleted (24 hours after soft delete)';