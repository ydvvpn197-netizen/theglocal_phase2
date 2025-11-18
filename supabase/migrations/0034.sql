-- Complete RLS Fix: Eliminate all recursive policies
-- Version: 0034
-- Description: Comprehensive fix to remove ALL recursion between communities and community_members
-- Date: 2025-10-15

-- ROOT CAUSE: The "Anyone can view public community members" policy on community_members
-- references the communities table, which creates recursion when communities policies
-- reference community_members.

-- SOLUTION: Remove ALL cross-table references in SELECT policies for these tables.

SET search_path TO public;

-- ============================================
-- STEP 1: DROP ALL PROBLEMATIC POLICIES
-- ============================================

-- Drop ALL existing SELECT policies on communities
DROP POLICY IF EXISTS "Anyone can view public communities" ON communities;
DROP POLICY IF EXISTS "Creators can view their own communities" ON communities;
DROP POLICY IF EXISTS "Members can view private communities" ON communities;
DROP POLICY IF EXISTS "Members can view private communities via function" ON communities;

-- Drop ALL existing SELECT policies on community_members
DROP POLICY IF EXISTS "Users can view own memberships" ON community_members;
DROP POLICY IF EXISTS "Creators can view their community members" ON community_members;
DROP POLICY IF EXISTS "Anyone can view public community members" ON community_members;
DROP POLICY IF EXISTS "Admins can view their community members" ON community_members;

-- ============================================
-- STEP 2: CREATE SIMPLE, NON-RECURSIVE POLICIES FOR COMMUNITIES
-- ============================================

-- Policy 1: Anyone (including anon) can view ALL communities
-- This is the simplest approach - no recursion possible
CREATE POLICY "Anyone can view all communities"
  ON communities FOR SELECT
  TO public
  USING (true);

-- Note: We'll handle privacy at the application level for now
-- This eliminates ALL recursion issues

-- ============================================
-- STEP 3: CREATE SIMPLE, NON-RECURSIVE POLICIES FOR COMMUNITY_MEMBERS
-- ============================================

-- Policy 1: Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON community_members FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Anyone can view all community members
-- Since communities are visible to all, members can be too
CREATE POLICY "Anyone can view all community members"
  ON community_members FOR SELECT
  TO public
  USING (true);

-- ============================================
-- STEP 4: KEEP WRITE POLICIES UNCHANGED
-- ============================================

-- These policies don't cause recursion and can remain as-is:
-- - "Users can join communities" (INSERT)
-- - "Users can leave communities" (DELETE)
-- - "Creators can remove their community members" (DELETE)
-- - "Admins can remove their community members" (DELETE)
-- - "Authenticated users can create communities" (INSERT)
-- - "Creators can update their communities" (UPDATE)
-- - "Creators can delete their communities" (DELETE)

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON POLICY "Anyone can view all communities" ON communities IS 
  'Simplified policy to eliminate recursion - privacy handled at application level';

COMMENT ON POLICY "Anyone can view all community members" ON community_members IS 
  'Simplified policy to eliminate recursion with communities table';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify that policies exist
DO $$
DECLARE
  community_policies_count INTEGER;
  member_policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO community_policies_count
  FROM pg_policies
  WHERE tablename = 'communities' AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO member_policies_count
  FROM pg_policies
  WHERE tablename = 'community_members' AND cmd = 'SELECT';
  
  RAISE NOTICE 'Communities SELECT policies: %', community_policies_count;
  RAISE NOTICE 'Community_members SELECT policies: %', member_policies_count;
  
  IF community_policies_count = 0 OR member_policies_count = 0 THEN
    RAISE EXCEPTION 'Policy creation failed!';
  END IF;
END$$;

