-- ============================================
-- FIX COMMENT REALTIME VISIBILITY ISSUE
-- Version: 0119
-- Description: Fix RLS policy to prioritize author check for realtime visibility
-- Date: 2025-01-29
-- ============================================
-- Problem: Comments disappear after creation because RLS policy checks can_view_post_safe first,
--          which may fail temporarily. Realtime payloads are blocked if RLS check fails.
-- Solution: Reorder RLS policy to check author first (fast, always works), then post access.
-- ============================================

SET search_path TO public;

-- ============================================
-- UPDATE COMMENTS RLS POLICY TO PRIORITIZE AUTHOR CHECK
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view comments on accessible posts" ON comments;

-- Create improved RLS policy that:
-- 1. Checks author first (fast, always works for comment author)
-- 2. Then checks post access (may fail temporarily but won't block author)
-- 3. This ensures realtime payloads are delivered to comment authors immediately
CREATE POLICY "Users can view comments on accessible posts" ON comments
    FOR SELECT
    USING (
        NOT is_deleted
        AND (
            -- PRIORITY 1: Author can always see their own comments (fast check, always works)
            (auth.uid() IS NOT NULL AND auth.uid() = author_id)
            OR 
            -- PRIORITY 2: Or if they can view the post (may fail temporarily but won't block author)
            can_view_post_safe(post_id, auth.uid())
        )
    );

-- ============================================
-- ADD INDEX FOR AUTHOR LOOKUP (OPTIMIZATION)
-- ============================================

-- Add index to speed up author_id lookups in RLS policy
CREATE INDEX IF NOT EXISTS idx_comments_author_id_not_deleted 
ON comments(author_id, created_at) 
WHERE is_deleted = false;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed comment RLS policy to prioritize author check';
    RAISE NOTICE '✅ Comment authors will now see their comments immediately via realtime';
    RAISE NOTICE '✅ Added index for faster author_id lookups';
    RAISE NOTICE '🔧 This should fix the disappearing comment issue';
END $$;

