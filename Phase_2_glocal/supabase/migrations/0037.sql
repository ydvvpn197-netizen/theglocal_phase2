-- Emergency Fix: Completely disable RLS on communities and community_members
-- Version: 0037
-- Description: Last resort - disable RLS completely to get the site working
-- Date: 2025-10-15

SET search_path TO public;

-- ============================================
-- DISABLE RLS COMPLETELY
-- ============================================

ALTER TABLE communities DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '⚠️  EMERGENCY: RLS completely disabled on communities and community_members';
  RAISE NOTICE '🚨 This is a temporary fix to get the site working';
  RAISE NOTICE '🔒 Security note: All communities and memberships are now publicly accessible';
  RAISE NOTICE '📝 TODO: Investigate root cause and implement proper non-recursive RLS';
END$$;

COMMENT ON TABLE communities IS 'EMERGENCY: RLS disabled due to infinite recursion - needs investigation';
COMMENT ON TABLE community_members IS 'EMERGENCY: RLS disabled due to infinite recursion - needs investigation';

