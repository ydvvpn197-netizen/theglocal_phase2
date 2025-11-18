-- Fix: Allow users to view private communities they created or are members of
-- This fixes the 404 error when accessing private communities

-- Ensure we're working in the public schema
SET search_path TO public;

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Anyone can view public communities" ON public.communities;

-- Create comprehensive view policies
-- 1. Anyone can view public communities
CREATE POLICY "Anyone can view public communities"
  ON public.communities FOR SELECT
  USING (NOT is_private);

-- 2. Creators can view their own communities (public or private)
CREATE POLICY "Creators can view their own communities"
  ON public.communities FOR SELECT
  USING (auth.uid() = created_by);

-- 3. Members can view private communities they've joined
CREATE POLICY "Members can view private communities"
  ON public.communities FOR SELECT
  USING (
    is_private = true 
    AND EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.community_id = communities.id
      AND community_members.user_id = auth.uid()
    )
  );