-- ============================================
-- FIX get_comments_enhanced TO NOT BLOCK COMMENTS
-- Version: 0120
-- Description: Fix get_comments_enhanced to allow comments even if can_view_post_safe fails
-- Date: 2025-01-29
-- ============================================
-- Problem: get_comments_enhanced returns empty array if can_view_post_safe returns false,
--          even though RLS policy allows authors to see their own comments.
-- Solution: Check author_id first, then can_view_post_safe. Don't block if author check passes.
-- ============================================

SET search_path TO public;

-- ============================================
-- UPDATE get_comments_enhanced TO PRIORITIZE AUTHOR CHECK
-- ============================================

CREATE OR REPLACE FUNCTION get_comments_enhanced(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'oldest',
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_max_depth INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    result JSONB;
    total_count INTEGER;
    offset_val INTEGER;
    top_level_ids UUID[];
    all_comments JSONB;
    can_access_post BOOLEAN;
    user_is_author BOOLEAN;
BEGIN
    current_user_id := COALESCE(p_user_id, auth.uid());
    offset_val := (p_page - 1) * p_page_size;
    
    -- CRITICAL: Check if user is author of any comments first (fast check)
    -- This allows authors to see their own comments even if can_view_post_safe fails
    SELECT EXISTS(
        SELECT 1 FROM comments 
        WHERE post_id = p_post_id 
        AND author_id = current_user_id 
        AND is_deleted = false
    ) INTO user_is_author;
    
    -- Check post access (may fail temporarily but won't block author)
    BEGIN
        can_access_post := can_view_post_safe(p_post_id, current_user_id);
    EXCEPTION WHEN OTHERS THEN
        -- If function fails, allow access if user is author
        RAISE WARNING 'can_view_post_safe failed for post % user %: %', p_post_id, current_user_id, SQLERRM;
        can_access_post := user_is_author; -- Allow if user is author
    END;
    
    -- CRITICAL: Allow access if user is author OR can view post
    -- This ensures authors can always see their own comments
    IF NOT can_access_post AND NOT user_is_author THEN
        RETURN jsonb_build_object(
            'comments', '[]'::jsonb,
            'pagination', jsonb_build_object(
                'page', p_page,
                'pageSize', p_page_size,
                'totalComments', 0,
                'totalPages', 0,
                'hasMore', false
            )
        );
    END IF;
    
    -- Get total count (including deleted comments for count)
    SELECT COUNT(*) INTO total_count 
    FROM comments 
    WHERE post_id = p_post_id;
    
    -- Step 1: Get paginated top-level comments
    WITH top_level_comments AS (
        SELECT 
            c.id
        FROM comments c
        WHERE c.post_id = p_post_id 
            AND c.parent_comment_id IS NULL
            AND c.is_deleted = false
        ORDER BY 
            CASE 
                WHEN p_sort_by = 'newest' THEN c.created_at 
            END DESC,
            CASE 
                WHEN p_sort_by = 'top' THEN (c.upvotes - c.downvotes) 
            END DESC,
            CASE 
                WHEN p_sort_by = 'controversial' THEN (c.upvotes + c.downvotes) 
            END DESC,
            CASE 
                WHEN p_sort_by = 'oldest' THEN c.created_at 
            END ASC
        LIMIT p_page_size OFFSET offset_val
    )
    SELECT ARRAY_AGG(id) INTO top_level_ids
    FROM top_level_comments;
    
    -- If no top-level comments, return empty result
    IF top_level_ids IS NULL OR array_length(top_level_ids, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'comments', '[]'::jsonb,
            'pagination', jsonb_build_object(
                'page', p_page,
                'pageSize', p_page_size,
                'totalComments', total_count,
                'totalPages', CEIL(total_count::NUMERIC / p_page_size),
                'hasMore', (p_page * p_page_size) < total_count
            )
        );
    END IF;
    
    -- Step 2: Get ALL comments (top-level + all their replies recursively)
    -- This includes all descendants of the paginated top-level comments
    WITH RECURSIVE comment_tree AS (
        -- Base: Start with the paginated top-level comments
        SELECT 
            c.id,
            c.post_id,
            c.parent_comment_id,
            c.author_id,
            c.body,
            c.upvotes,
            c.downvotes,
            c.media_count,
            c.is_deleted,
            c.is_edited,
            c.created_at,
            c.updated_at,
            COALESCE(v.vote_type, null) as user_vote,
            u.anonymous_handle as author_handle,
            u.avatar_seed as author_avatar_seed,
            (c.upvotes - c.downvotes) as score,
            0 as depth_level
        FROM comments c
        INNER JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = current_user_id
        WHERE c.id = ANY(COALESCE(top_level_ids, ARRAY[]::UUID[]))
            AND c.is_deleted = false
        
        UNION ALL
        
        -- Recursive: Get all replies at any depth
        SELECT 
            c.id,
            c.post_id,
            c.parent_comment_id,
            c.author_id,
            c.body,
            c.upvotes,
            c.downvotes,
            c.media_count,
            c.is_deleted,
            c.is_edited,
            c.created_at,
            c.updated_at,
            COALESCE(v.vote_type, null) as user_vote,
            u.anonymous_handle as author_handle,
            u.avatar_seed as author_avatar_seed,
            (c.upvotes - c.downvotes) as score,
            ct.depth_level + 1 as depth_level
        FROM comments c
        INNER JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = current_user_id
        INNER JOIN comment_tree ct ON c.parent_comment_id = ct.id
        WHERE ct.depth_level < p_max_depth
            AND c.post_id = p_post_id
            AND c.is_deleted = false
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'post_id', post_id,
            'parent_comment_id', parent_comment_id,
            'author_id', author_id,
            'body', body,
            'upvotes', upvotes,
            'downvotes', downvotes,
            'media_count', media_count,
            'is_deleted', is_deleted,
            'is_edited', is_edited,
            'created_at', created_at,
            'updated_at', updated_at,
            'user_vote', user_vote,
            'author', jsonb_build_object(
                'anonymous_handle', author_handle,
                'avatar_seed', author_avatar_seed
            ),
            'score', score,
            'depth_level', depth_level,
            'reply_count', 0, -- Will be calculated by frontend
            'has_more_replies', false,
            'replies', '[]'::jsonb -- Empty, frontend will build tree
        )
        ORDER BY created_at ASC
    ) INTO all_comments
    FROM comment_tree;
    
    -- Return result with all comments (flat list for frontend to build tree)
    RETURN jsonb_build_object(
        'comments', COALESCE(all_comments, '[]'::jsonb),
        'pagination', jsonb_build_object(
            'page', p_page,
            'pageSize', p_page_size,
            'totalComments', total_count,
            'totalPages', CEIL(total_count::NUMERIC / p_page_size),
            'hasMore', (p_page * p_page_size) < total_count
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'get_comments_enhanced failed for post % user %: %', p_post_id, current_user_id, SQLERRM;
    RETURN jsonb_build_object(
        'comments', '[]'::jsonb,
        'pagination', jsonb_build_object(
            'page', p_page,
            'pageSize', p_page_size,
            'totalComments', 0,
            'totalPages', 0,
            'hasMore', false
        ),
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_comments_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION get_comments_enhanced TO anon;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed get_comments_enhanced to prioritize author check';
    RAISE NOTICE '✅ Function now allows authors to see their own comments even if can_view_post_safe fails';
    RAISE NOTICE '✅ Comments should now be visible to their authors immediately';
END $$;

