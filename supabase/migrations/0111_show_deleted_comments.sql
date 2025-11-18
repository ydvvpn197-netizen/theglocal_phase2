-- ============================================
-- SHOW DELETED COMMENTS WITH LABEL
-- ============================================
-- Update comment fetching functions to include deleted comments
-- Deleted comments will be displayed with a "Deleted" badge and "[deleted]" text in the UI
-- Version: 0111
-- Date: 2025-01-29

-- ============================================
-- UPDATE get_comment_thread_robust FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_comment_thread_robust(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    post_id UUID,
    parent_comment_id UUID,
    author_id UUID,
    body TEXT,
    upvotes INTEGER,
    downvotes INTEGER,
    media_count INTEGER,
    is_deleted BOOLEAN,
    is_edited BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_vote TEXT,
    author_handle TEXT,
    author_avatar_seed TEXT,
    depth INTEGER,
    path TEXT[]
) AS $$
DECLARE
    current_user_id UUID;
    can_access_post BOOLEAN;
BEGIN
    -- Set current user
    current_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Check if user can access the post (bypass RLS for this check)
    SELECT can_view_post_safe(p_post_id, current_user_id) INTO can_access_post;
    
    -- If user cannot access post, return empty result
    IF NOT can_access_post THEN
        RETURN;
    END IF;
    
    -- Return comment tree with proper structure
    -- REMOVED: AND c.is_deleted = false filters to show deleted comments
    RETURN QUERY
    WITH RECURSIVE comment_tree AS (
        -- Base case: top-level comments (SECURITY DEFINER bypasses RLS)
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
            COALESCE(v.vote_type, '') as user_vote,
            u.anonymous_handle as author_handle,
            u.avatar_seed as author_avatar_seed,
            0 as depth,
            ARRAY[c.id::TEXT] as path
        FROM comments c
        INNER JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = current_user_id
        WHERE c.post_id = p_post_id 
            AND c.parent_comment_id IS NULL
            -- REMOVED: AND c.is_deleted = false to show deleted comments
        
        UNION ALL
        
        -- Recursive case: child comments
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
            COALESCE(v.vote_type, '') as user_vote,
            u.anonymous_handle as author_handle,
            u.avatar_seed as author_avatar_seed,
            ct.depth + 1,
            ct.path || c.id::TEXT
        FROM comments c
        INNER JOIN comment_tree ct ON ct.id = c.parent_comment_id
        INNER JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = current_user_id
        WHERE ct.depth < 15 -- Increased depth limit
            -- REMOVED: AND c.is_deleted = false to show deleted comments
    )
    SELECT * FROM comment_tree
    ORDER BY path;
    
EXCEPTION 
    WHEN OTHERS THEN
        -- Log the error but don't fail completely
        RAISE WARNING 'get_comment_thread_robust failed for post % user %: %', p_post_id, current_user_id, SQLERRM;
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- UPDATE get_comments_simple FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_comments_simple(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    post_id UUID,
    parent_comment_id UUID,
    author_id UUID,
    body TEXT,
    upvotes INTEGER,
    downvotes INTEGER,
    media_count INTEGER,
    is_deleted BOOLEAN,
    is_edited BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_vote TEXT,
    author_handle TEXT,
    author_avatar_seed TEXT
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := COALESCE(p_user_id, auth.uid());
    
    RETURN QUERY
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
        COALESCE(v.vote_type, '') as user_vote,
        u.anonymous_handle as author_handle,
        u.avatar_seed as author_avatar_seed
    FROM comments c
    INNER JOIN users u ON u.id = c.author_id
    LEFT JOIN votes v ON v.content_id = c.id 
        AND v.content_type = 'comment' 
        AND v.user_id = current_user_id
    WHERE c.post_id = p_post_id 
        -- REMOVED: AND c.is_deleted = false to show deleted comments
    ORDER BY c.created_at ASC;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE WARNING 'get_comments_simple failed for post % user %: %', p_post_id, current_user_id, SQLERRM;
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- UPDATE get_comments_enhanced FUNCTION
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
BEGIN
    current_user_id := COALESCE(p_user_id, auth.uid());
    offset_val := (p_page - 1) * p_page_size;
    
    -- Check access
    IF NOT can_view_post_safe(p_post_id, current_user_id) THEN
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
    
    -- Get total count (including deleted comments)
    SELECT COUNT(*) INTO total_count 
    FROM comments 
    WHERE post_id = p_post_id;
    -- REMOVED: AND is_deleted = false to include deleted comments in count
    
    -- Build result with comments
    WITH sorted_comments AS (
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
            0 as reply_count, -- Will be calculated separately if needed
            0 as depth_level,
            false as has_more_replies
        FROM comments c
        INNER JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = current_user_id
        WHERE c.post_id = p_post_id 
            -- REMOVED: AND c.is_deleted = false to show deleted comments
            AND c.parent_comment_id IS NULL -- Only top-level for pagination
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
    ),
    comment_array AS (
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
                'reply_count', reply_count,
                'depth_level', depth_level,
                'has_more_replies', has_more_replies,
                'replies', '[]'::jsonb
            )
        ) as comments
        FROM sorted_comments
    )
    SELECT jsonb_build_object(
        'comments', COALESCE(ca.comments, '[]'::jsonb),
        'pagination', jsonb_build_object(
            'page', p_page,
            'pageSize', p_page_size,
            'totalComments', total_count,
            'totalPages', CEIL(total_count::NUMERIC / p_page_size),
            'hasMore', (p_page * p_page_size) < total_count
        )
    ) INTO result
    FROM comment_array ca;
    
    RETURN COALESCE(result, jsonb_build_object(
        'comments', '[]'::jsonb,
        'pagination', jsonb_build_object(
            'page', p_page,
            'pageSize', p_page_size,
            'totalComments', 0,
            'totalPages', 0,
            'hasMore', false
        )
    ));
    
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
-- GRANT PERMISSIONS (maintain existing)
-- ============================================

GRANT EXECUTE ON FUNCTION get_comment_thread_robust TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_thread_robust TO anon;
GRANT EXECUTE ON FUNCTION get_comments_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_comments_simple TO anon;
GRANT EXECUTE ON FUNCTION get_comments_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION get_comments_enhanced TO anon;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Updated comment functions to include deleted comments';
    RAISE NOTICE '✅ get_comment_thread_robust now includes deleted comments';
    RAISE NOTICE '✅ get_comments_simple now includes deleted comments';
    RAISE NOTICE '✅ get_comments_enhanced now includes deleted comments';
    RAISE NOTICE '📝 UI will display deleted comments with badge and [deleted] text';
END $$;

