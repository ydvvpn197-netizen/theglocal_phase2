-- Temporary Fix: Disable RLS on problematic tables
-- Version: 0036
-- Description: Disable RLS temporarily on posts, comments, and polls to break recursion chain
-- Date: 2025-10-15

-- The recursion chain: communities → posts (checks communities) → communities → community_members

SET search_path TO public;

-- ============================================
-- TEMPORARILY DISABLE RLS ON RELATED TABLES
-- ============================================

-- This is a temporary fix to get the site working
-- We'll re-enable with proper policies later

ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE polls DISABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '⚠️  RLS temporarily disabled on posts, comments, polls';
  RAISE NOTICE '📝 This allows communities to be queried without recursion';
  RAISE NOTICE '🔧 TODO: Re-enable with simplified, non-recursive policies';
END$$;

COMMENT ON TABLE posts IS 'RLS temporarily disabled - needs non-recursive policies';
COMMENT ON TABLE comments IS 'RLS temporarily disabled - needs non-recursive policies';
COMMENT ON TABLE polls IS 'RLS temporarily disabled - needs non-recursive policies';

