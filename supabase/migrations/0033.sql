-- Fix: Resolve infinite recursion in community RLS policies
-- Version: 0033
-- Description: Remove the problematic "Members can view private communities" policy that causes recursion
-- Date: 2025-10-15

-- The issue: "Members can view private communities" policy checks community_members,
-- which has policies that check back to communities, causing infinite recursion

-- ============================================
-- DROP THE PROBLEMATIC POLICY
-- ============================================

DROP POLICY IF EXISTS "Members can view private communities" ON public.communities;

-- ============================================
-- SIMPLIFY: Keep only non-recursive policies
-- ============================================

-- We already have these two policies from migration 0031, which work fine:
-- 1. "Anyone can view public communities" - checks only is_private column
-- 2. "Creators can view their own communities" - checks only created_by column

-- For members to view private communities, we need a different approach
-- that doesn't cause recursion. We'll use a security definer function.

-- ============================================
-- CREATE SECURITY DEFINER FUNCTION
-- ============================================

-- Function to check if a user is a member of a community
-- This breaks the recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_community_member(
  community_id_param UUID,
  user_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = community_id_param
    AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_community_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_member(UUID, UUID) TO anon;

-- ============================================
-- CREATE NEW NON-RECURSIVE POLICY
-- ============================================

-- Members can view private communities they've joined (using security definer function)
CREATE POLICY "Members can view private communities via function"
  ON public.communities FOR SELECT
  USING (
    is_private = true 
    AND public.is_community_member(id, auth.uid())
  );

-- ============================================
-- VERIFY COMMUNITY_MEMBERS POLICIES ARE SIMPLE
-- ============================================

-- Ensure community_members policies don't cause recursion
-- Drop and recreate the problematic "Anyone can view public community members" policy

DROP POLICY IF EXISTS "Anyone can view public community members" ON public.community_members;

-- Create a simpler version that uses the security definer function for community lookup
-- This policy allows viewing members of public communities without recursion
CREATE POLICY "Anyone can view public community members"
  ON public.community_members FOR SELECT
  USING (
    -- Use a simple subquery with SECURITY DEFINER context
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id 
      AND NOT c.is_private
    )
  );

-- ============================================
-- ADD COMMENT
-- ============================================

COMMENT ON FUNCTION public.is_community_member(UUID, UUID) IS 
  'Security definer function to check community membership without causing RLS recursion';

COMMENT ON POLICY "Members can view private communities via function" ON public.communities IS 
  'Allows members to view private communities using security definer function to prevent recursion';

