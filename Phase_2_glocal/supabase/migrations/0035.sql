-- Nuclear RLS Fix: Disable and rebuild ALL policies from scratch
-- Version: 0035
-- Description: Completely rebuild RLS policies to eliminate recursion
-- Date: 2025-10-15

-- This is a "nuclear" approach - we'll disable RLS, drop ALL policies,
-- and rebuild with only simple, non-recursive policies.

SET search_path TO public;

-- ============================================
-- STEP 1: DROP ALL POLICIES ON BOTH TABLES
-- ============================================

-- Drop every single policy on communities table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'communities') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON communities';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Drop every single policy on community_members table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'community_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON community_members';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: TEMPORARILY DISABLE RLS
-- ============================================

ALTER TABLE communities DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: RE-ENABLE RLS
-- ============================================

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE MINIMAL NON-RECURSIVE POLICIES FOR COMMUNITIES
-- ============================================

-- SELECT: Anyone can view all communities
CREATE POLICY "select_all_communities"
  ON communities FOR SELECT
  USING (true);

-- INSERT: Authenticated users can create communities
CREATE POLICY "insert_communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: Only creators can update
CREATE POLICY "update_own_communities"
  ON communities FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: Only creators can delete
CREATE POLICY "delete_own_communities"
  ON communities FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================
-- STEP 5: CREATE MINIMAL NON-RECURSIVE POLICIES FOR COMMUNITY_MEMBERS
-- ============================================

-- SELECT: Anyone can view all memberships
CREATE POLICY "select_all_members"
  ON community_members FOR SELECT
  USING (true);

-- INSERT: Users can join communities
CREATE POLICY "insert_memberships"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can leave communities they're in
CREATE POLICY "delete_own_memberships"
  ON community_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE: Users can update their own membership role (for admin promotions)
CREATE POLICY "update_memberships"
  ON community_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 6: VERIFICATION
-- ============================================

DO $$
DECLARE
  community_policies INTEGER;
  member_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO community_policies FROM pg_policies WHERE tablename = 'communities';
  SELECT COUNT(*) INTO member_policies FROM pg_policies WHERE tablename = 'community_members';
  
  RAISE NOTICE '✅ Communities policies: %', community_policies;
  RAISE NOTICE '✅ Community_members policies: %', member_policies;
  
  IF community_policies < 4 OR member_policies < 4 THEN
    RAISE EXCEPTION 'Not enough policies created!';
  END IF;
END$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "select_all_communities" ON communities IS 
  'Nuclear fix: Allow all access to eliminate recursion. Privacy handled at app level.';

COMMENT ON POLICY "select_all_members" ON community_members IS 
  'Nuclear fix: Allow all access to eliminate recursion with communities table.';

