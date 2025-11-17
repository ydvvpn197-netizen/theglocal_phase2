-- Fix Creator Memberships
-- Version: 0027
-- Description: Add missing admin memberships for community creators who are not members
-- Date: 2025-10-13

-- ============================================
-- FIX ORPHANED COMMUNITIES
-- ============================================

-- Find and fix communities where the creator is not a member
-- This can happen if the member insertion failed during community creation

DO $$
DECLARE
  v_community RECORD;
  v_member_exists BOOLEAN;
  v_count INTEGER := 0;
BEGIN
  -- Loop through all communities
  FOR v_community IN 
    SELECT id, created_by, name 
    FROM communities 
    WHERE created_by IS NOT NULL
      AND is_deleted = FALSE
  LOOP
    -- Check if creator is a member
    SELECT EXISTS (
      SELECT 1 
      FROM community_members 
      WHERE community_id = v_community.id 
        AND user_id = v_community.created_by
    ) INTO v_member_exists;
    
    -- If creator is not a member, add them as admin
    IF NOT v_member_exists THEN
      BEGIN
        INSERT INTO community_members (community_id, user_id, role, joined_at)
        VALUES (v_community.id, v_community.created_by, 'admin', NOW())
        ON CONFLICT (community_id, user_id) DO NOTHING;
        
        v_count := v_count + 1;
        RAISE NOTICE 'Added creator as admin for community: % (ID: %)', v_community.name, v_community.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to add creator as admin for community % (ID: %): %', 
          v_community.name, v_community.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % orphaned communities', v_count;
END $$;

-- ============================================
-- ADD DATABASE TRIGGER TO PREVENT FUTURE ISSUES
-- ============================================

-- Create a trigger function to ensure creator is always added as admin
CREATE OR REPLACE FUNCTION ensure_creator_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- After a community is created, ensure the creator is added as an admin member
  -- This runs AFTER the community insert
  IF NOT EXISTS (
    SELECT 1 FROM community_members 
    WHERE community_id = NEW.id 
      AND user_id = NEW.created_by
  ) THEN
    -- Add creator as admin if not already a member
    INSERT INTO community_members (community_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.created_by, 'admin', NOW())
    ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'Auto-added creator as admin for community: %', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after community insert
DROP TRIGGER IF EXISTS trigger_ensure_creator_is_admin ON communities;
CREATE TRIGGER trigger_ensure_creator_is_admin
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION ensure_creator_is_admin();

-- ============================================
-- ADD FUNCTION TO CHECK COMMUNITY HEALTH
-- ============================================

-- Function to find orphaned communities (communities without their creator as member)
CREATE OR REPLACE FUNCTION find_orphaned_communities()
RETURNS TABLE (
  community_id UUID,
  community_name TEXT,
  community_slug TEXT,
  creator_id UUID,
  created_at TIMESTAMPTZ,
  has_any_members BOOLEAN,
  member_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.created_by,
    c.created_at,
    EXISTS (SELECT 1 FROM community_members WHERE community_id = c.id) as has_any_members,
    c.member_count
  FROM communities c
  WHERE c.is_deleted = FALSE
    AND c.created_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = c.id 
        AND cm.user_id = c.created_by
    )
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION find_orphaned_communities() TO authenticated, service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION ensure_creator_is_admin() IS 
  'Trigger function that ensures community creator is always added as admin member';

COMMENT ON FUNCTION find_orphaned_communities() IS 
  'Returns communities where the creator is not a member (orphaned communities)';

COMMENT ON TRIGGER trigger_ensure_creator_is_admin ON communities IS 
  'Automatically adds community creator as admin member after community creation';

