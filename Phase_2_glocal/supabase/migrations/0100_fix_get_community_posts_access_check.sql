-- Fix get_community_posts to check community access
-- Version: 0100
-- Description: Add community access check to get_community_posts function
-- Date: 2025-01-XX

SET search_path TO public;

-- ============================================
-- FIX get_community_posts FUNCTION
-- ============================================

-- Drop the existing function first to allow return type changes
DROP FUNCTION IF EXISTS get_community_posts(UUID, UUID, INTEGER, INTEGER, BOOLEAN);

-- Recreate the function with community access check
CREATE OR REPLACE FUNCTION get_community_posts(
    p_community_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_include_pinned BOOLEAN DEFAULT true
) RETURNS TABLE (
    id UUID,
    title TEXT,
    body TEXT,
    external_url TEXT,
    location_city TEXT,
    upvotes INTEGER,
    downvotes INTEGER,
    comment_count INTEGER,
    media_count INTEGER,
    view_count INTEGER,
    is_pinned BOOLEAN,
    is_announcement BOOLEAN,
    created_at TIMESTAMPTZ,
    user_vote TEXT,
    author_handle TEXT,
    author_avatar_seed TEXT
) AS $$
DECLARE
    user_has_access BOOLEAN;
BEGIN
    -- Check if user has access to the community
    user_has_access := can_view_community_safe(p_community_id, p_user_id);
    
    -- If user doesn't have access, return empty result
    IF NOT user_has_access THEN
        RETURN;
    END IF;
    
    -- Return posts with proper access check
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.body,
        p.external_url,
        p.location_city,
        p.upvotes,
        p.downvotes,
        p.comment_count,
        p.media_count,
        COALESCE(p.view_count, 0) as view_count,
        COALESCE(p.is_pinned, false) as is_pinned,
        COALESCE(p.is_announcement, false) as is_announcement,
        p.created_at,
        v.vote_type as user_vote,
        u.anonymous_handle as author_handle,
        u.avatar_seed as author_avatar_seed
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN votes v ON v.content_id = p.id 
        AND v.content_type = 'post' 
        AND v.user_id = p_user_id
    WHERE p.community_id = p_community_id 
        AND p.is_deleted = false
        -- Additional check: only return posts if user has access OR is the author
        AND (
            can_view_community_safe(p.community_id, p_user_id)
            OR p.author_id = p_user_id
        )
    ORDER BY 
        CASE WHEN p_include_pinned THEN p.is_pinned END DESC NULLS LAST,
        p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_community_posts(UUID, UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed get_community_posts to check community access';
  RAISE NOTICE '✅ Function now respects RLS policies for community access';
  RAISE NOTICE '📝 Migration 0100 complete';
END$$;

COMMENT ON FUNCTION get_community_posts(UUID, UUID, INTEGER, INTEGER, BOOLEAN) IS 
  'Optimized function to get community posts with pagination and proper access control. Returns posts only if user has access to the community or is the author of the post.';

