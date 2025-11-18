-- ============================================
-- ENHANCED COMMENT THREADING SYSTEM
-- ============================================
-- Add pagination, sorting, and improved threading for comments
-- Version: 0092
-- Description: Enhanced comment threading with pagination and sorting
-- Date: 2025-01-28

-- ============================================
-- COMMUNITY THREAD CONFIGURATION
-- ============================================

-- Add threading configuration to communities
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS max_thread_depth INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS comments_per_page INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS default_comment_sort TEXT DEFAULT 'oldest',
ADD COLUMN IF NOT EXISTS allow_thread_continuation BOOLEAN DEFAULT true;

-- Create enum for comment sort options
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_sort_type') THEN
        CREATE TYPE comment_sort_type AS ENUM (
            'oldest',        -- Original posting order
            'newest',        -- Most recent first
            'top',          -- Highest score first
            'controversial' -- Most voted (up + down)
        );
    END IF;
END $$;

-- ============================================
-- COMMENT THREAD METADATA TABLE
-- ============================================

-- Create table for tracking thread metadata and continuation points
CREATE TABLE IF NOT EXISTS comment_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    root_comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    continuation_after_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    thread_depth INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    is_continuation_thread BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for comment threads
CREATE INDEX IF NOT EXISTS idx_comment_threads_post_id 
ON comment_threads(post_id, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_threads_root_comment 
ON comment_threads(root_comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_threads_continuation 
ON comment_threads(continuation_after_comment_id) 
WHERE continuation_after_comment_id IS NOT NULL;

-- ============================================
-- COMMENT SORTING AND PAGINATION FUNCTIONS
-- ============================================

-- Function to get paginated comments with sorting
CREATE OR REPLACE FUNCTION get_comments_paginated(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_sort_by comment_sort_type DEFAULT 'oldest',
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_parent_id UUID DEFAULT NULL
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
    score INTEGER,
    reply_count INTEGER,
    depth_level INTEGER,
    has_more_replies BOOLEAN
) AS $$
DECLARE
    offset_value INTEGER;
    max_depth INTEGER;
BEGIN
    -- Calculate offset
    offset_value := (p_page - 1) * p_page_size;
    
    -- Get community max depth setting
    SELECT max_thread_depth INTO max_depth
    FROM communities c
    JOIN posts p ON p.community_id = c.id
    WHERE p.id = p_post_id;
    
    max_depth := COALESCE(max_depth, 10);

    RETURN QUERY
    WITH RECURSIVE comment_tree AS (
        -- Base case: get comments at specified level
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
            v.vote_type as user_vote,
            u.anonymous_handle as author_handle,
            u.avatar_seed as author_avatar_seed,
            (c.upvotes - c.downvotes) as score,
            0 as reply_count, -- Will be calculated separately
            CASE 
                WHEN p_parent_id IS NULL THEN 0
                ELSE 1
            END as depth_level,
            false as has_more_replies -- Will be calculated separately
        FROM comments c
        JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = p_user_id
        WHERE c.post_id = p_post_id
            AND c.is_deleted = false
            AND (
                (p_parent_id IS NULL AND c.parent_comment_id IS NULL) OR
                (p_parent_id IS NOT NULL AND c.parent_comment_id = p_parent_id)
            )
    ),
    sorted_comments AS (
        SELECT *
        FROM comment_tree
        ORDER BY 
            CASE WHEN p_sort_by = 'oldest' THEN created_at END ASC,
            CASE WHEN p_sort_by = 'newest' THEN created_at END DESC,
            CASE WHEN p_sort_by = 'top' THEN score END DESC,
            CASE WHEN p_sort_by = 'controversial' THEN (upvotes + downvotes) END DESC,
            created_at ASC -- Tie breaker
        LIMIT p_page_size
        OFFSET offset_value
    ),
    comments_with_reply_counts AS (
        SELECT 
            sc.*,
            COALESCE(reply_counts.count, 0) as reply_count,
            CASE 
                WHEN COALESCE(reply_counts.count, 0) > 0 THEN true
                ELSE false
            END as has_more_replies
        FROM sorted_comments sc
        LEFT JOIN (
            SELECT 
                parent_comment_id,
                COUNT(*) as count
            FROM comments
            WHERE post_id = p_post_id AND is_deleted = false
            GROUP BY parent_comment_id
        ) reply_counts ON reply_counts.parent_comment_id = sc.id
    )
    SELECT * FROM comments_with_reply_counts
    ORDER BY 
        CASE WHEN p_sort_by = 'oldest' THEN created_at END ASC,
        CASE WHEN p_sort_by = 'newest' THEN created_at END DESC,
        CASE WHEN p_sort_by = 'top' THEN score END DESC,
        CASE WHEN p_sort_by = 'controversial' THEN (upvotes + downvotes) END DESC,
        created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to create continuation thread when depth limit is reached
CREATE OR REPLACE FUNCTION create_continuation_thread(
    p_post_id UUID,
    p_root_comment_id UUID,
    p_continuation_after_comment_id UUID
) RETURNS UUID AS $$
DECLARE
    thread_id UUID;
    current_depth INTEGER;
BEGIN
    -- Calculate current thread depth
    WITH RECURSIVE depth_calc AS (
        SELECT id, parent_comment_id, 0 as depth
        FROM comments 
        WHERE id = p_root_comment_id
        
        UNION ALL
        
        SELECT c.id, c.parent_comment_id, dc.depth + 1
        FROM comments c
        JOIN depth_calc dc ON dc.id = c.parent_comment_id
        WHERE dc.depth < 50 -- Safety limit
    )
    SELECT MAX(depth) INTO current_depth
    FROM depth_calc;

    -- Create continuation thread entry
    INSERT INTO comment_threads (
        post_id,
        root_comment_id,
        continuation_after_comment_id,
        thread_depth,
        is_continuation_thread
    ) VALUES (
        p_post_id,
        p_root_comment_id,
        p_continuation_after_comment_id,
        current_depth,
        true
    ) RETURNING id INTO thread_id;

    RETURN thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get thread continuation info
CREATE OR REPLACE FUNCTION get_thread_continuation_info(
    p_comment_id UUID
) RETURNS TABLE (
    needs_continuation BOOLEAN,
    continuation_thread_id UUID,
    current_depth INTEGER,
    max_depth INTEGER
) AS $$
DECLARE
    current_depth_val INTEGER;
    max_depth_val INTEGER;
    continuation_id UUID;
BEGIN
    -- Calculate current depth
    WITH RECURSIVE depth_calc AS (
        SELECT id, parent_comment_id, 0 as depth
        FROM comments 
        WHERE parent_comment_id IS NULL AND post_id = (
            SELECT post_id FROM comments WHERE id = p_comment_id
        )
        
        UNION ALL
        
        SELECT c.id, c.parent_comment_id, dc.depth + 1
        FROM comments c
        JOIN depth_calc dc ON dc.id = c.parent_comment_id
        WHERE dc.depth < 50 -- Safety limit
    )
    SELECT depth INTO current_depth_val
    FROM depth_calc
    WHERE id = p_comment_id;

    -- Get max depth from community settings
    SELECT c.max_thread_depth INTO max_depth_val
    FROM communities c
    JOIN posts p ON p.community_id = c.id
    JOIN comments com ON com.post_id = p.id
    WHERE com.id = p_comment_id;

    max_depth_val := COALESCE(max_depth_val, 10);

    -- Check if continuation thread exists
    SELECT id INTO continuation_id
    FROM comment_threads
    WHERE continuation_after_comment_id = p_comment_id;

    RETURN QUERY SELECT 
        (current_depth_val >= max_depth_val) as needs_continuation,
        continuation_id,
        current_depth_val,
        max_depth_val;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get comment statistics for sorting
CREATE OR REPLACE FUNCTION get_comment_stats(
    p_post_id UUID
) RETURNS TABLE (
    total_comments INTEGER,
    top_level_comments INTEGER,
    avg_thread_depth NUMERIC,
    most_popular_comment_id UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH comment_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE parent_comment_id IS NULL) as top_level,
            (SELECT id FROM comments 
             WHERE post_id = p_post_id AND is_deleted = false 
             ORDER BY (upvotes - downvotes) DESC 
             LIMIT 1) as most_popular_id
        FROM comments
        WHERE post_id = p_post_id AND is_deleted = false
    ),
    depth_stats AS (
        WITH RECURSIVE comment_depths AS (
            SELECT id, parent_comment_id, 0 as depth
            FROM comments
            WHERE post_id = p_post_id AND parent_comment_id IS NULL AND is_deleted = false
            
            UNION ALL
            
            SELECT c.id, c.parent_comment_id, cd.depth + 1
            FROM comments c
            JOIN comment_depths cd ON cd.id = c.parent_comment_id
            WHERE c.is_deleted = false AND cd.depth < 50
        )
        SELECT AVG(depth) as avg_depth
        FROM comment_depths
    )
    SELECT 
        cs.total::INTEGER,
        cs.top_level::INTEGER,
        COALESCE(ds.avg_depth, 0)::NUMERIC,
        cs.most_popular_id
    FROM comment_stats cs
    CROSS JOIN depth_stats ds;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- OPTIMIZED COMMENT TREE BUILDER
-- ============================================

-- Enhanced function to build comment tree with pagination support
CREATE OR REPLACE FUNCTION build_comment_tree_paginated(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_parent_id UUID DEFAULT NULL,
    p_sort_by comment_sort_type DEFAULT 'oldest',
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_max_depth INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '[]'::jsonb;
    comment_record RECORD;
    child_comments JSONB;
    current_depth INTEGER := 0;
BEGIN
    -- Calculate current depth if parent_id is provided
    IF p_parent_id IS NOT NULL THEN
        WITH RECURSIVE depth_calc AS (
            SELECT id, parent_comment_id, 0 as depth
            FROM comments 
            WHERE parent_comment_id IS NULL AND post_id = p_post_id
            
            UNION ALL
            
            SELECT c.id, c.parent_comment_id, dc.depth + 1
            FROM comments c
            JOIN depth_calc dc ON dc.id = c.parent_comment_id
            WHERE dc.depth < 50
        )
        SELECT depth INTO current_depth
        FROM depth_calc
        WHERE id = p_parent_id;
    END IF;

    -- Get comments at current level
    FOR comment_record IN 
        SELECT * FROM get_comments_paginated(
            p_post_id,
            p_user_id,
            p_sort_by,
            p_page,
            p_page_size,
            p_parent_id
        )
    LOOP
        -- Build comment object
        DECLARE
            comment_obj JSONB;
        BEGIN
            comment_obj := jsonb_build_object(
                'id', comment_record.id,
                'post_id', comment_record.post_id,
                'parent_comment_id', comment_record.parent_comment_id,
                'author_id', comment_record.author_id,
                'body', comment_record.body,
                'upvotes', comment_record.upvotes,
                'downvotes', comment_record.downvotes,
                'media_count', comment_record.media_count,
                'is_deleted', comment_record.is_deleted,
                'is_edited', comment_record.is_edited,
                'created_at', comment_record.created_at,
                'updated_at', comment_record.updated_at,
                'user_vote', comment_record.user_vote,
                'author', jsonb_build_object(
                    'anonymous_handle', comment_record.author_handle,
                    'avatar_seed', comment_record.author_avatar_seed
                ),
                'score', comment_record.score,
                'reply_count', comment_record.reply_count,
                'depth_level', comment_record.depth_level,
                'has_more_replies', comment_record.has_more_replies
            );

            -- Add replies if within depth limit and has replies
            IF current_depth < p_max_depth AND comment_record.reply_count > 0 THEN
                child_comments := build_comment_tree_paginated(
                    p_post_id,
                    p_user_id,
                    comment_record.id,
                    p_sort_by,
                    1, -- Always start from page 1 for replies
                    p_page_size,
                    p_max_depth
                );
                comment_obj := comment_obj || jsonb_build_object('replies', child_comments);
            ELSE
                comment_obj := comment_obj || jsonb_build_object('replies', '[]'::jsonb);
            END IF;

            -- Add continuation info if at depth limit
            IF current_depth >= p_max_depth AND comment_record.reply_count > 0 THEN
                comment_obj := comment_obj || jsonb_build_object(
                    'needs_continuation', true,
                    'continuation_url', '/posts/' || p_post_id || '/comments/' || comment_record.id
                );
            END IF;

            result := result || jsonb_build_array(comment_obj);
        END;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- UPDATE EXISTING COMMUNITIES
-- ============================================

-- Set default threading configuration for existing communities
UPDATE communities 
SET 
    max_thread_depth = 10,
    comments_per_page = 20,
    default_comment_sort = 'oldest',
    allow_thread_continuation = true
WHERE max_thread_depth IS NULL;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_comments_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION create_continuation_thread TO authenticated;
GRANT EXECUTE ON FUNCTION get_thread_continuation_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_stats TO authenticated;
GRANT EXECUTE ON FUNCTION build_comment_tree_paginated TO authenticated;

-- Grant access to comment threads table
GRANT SELECT, INSERT, UPDATE ON comment_threads TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Added paginated comment system with sorting options';
    RAISE NOTICE '✅ Implemented thread continuation for deep nesting';
    RAISE NOTICE '✅ Created optimized comment tree builder';
    RAISE NOTICE '✅ Added comment statistics and metadata tracking';
    RAISE NOTICE '✅ Enhanced comment threading system is ready';
END $$;
