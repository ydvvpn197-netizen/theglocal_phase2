-- ============================================
-- FIX SUPER ADMIN COMMUNITY UPDATE ACCESS
-- ============================================
-- Allow super admins to update communities (including featured status)
-- Super admins can now feature/unfeature communities from admin portal
-- Version: 0117
-- Date: 2025-01-30

SET search_path TO public;

-- ============================================
-- UPDATE RLS POLICY FOR COMMUNITIES UPDATE
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Creators and admins can update communities" ON communities;

-- Recreate policy with super admin exemption
CREATE POLICY "Creators and admins can update communities"
  ON communities FOR UPDATE
  USING (
    is_community_creator_safe(id, auth.uid()) OR
    is_community_admin_safe(id, auth.uid()) OR
    is_super_admin_safe(auth.uid())
  );

-- Add comment to document the policy
COMMENT ON POLICY "Creators and admins can update communities" ON communities IS 
  'Allows community creators, community admins, and super admins to update communities. Super admins can update any community including setting is_featured status.';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Updated communities UPDATE policy to allow super admins';
    RAISE NOTICE '✅ Super admins can now feature/unfeature communities from admin portal';
END $$;

