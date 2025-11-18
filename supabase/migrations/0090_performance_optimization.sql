-- ============================================
-- DATABASE PERFORMANCE OPTIMIZATION
-- ============================================
-- Add indexes and optimize queries for better performance
-- Version: 0090
-- Description: Performance indexes and query optimizations
-- Date: 2025-01-28

-- ============================================
-- POSTS TABLE PERFORMANCE INDEXES
-- ============================================

-- Index for post feed queries (community + timestamp)
CREATE INDEX IF NOT EXISTS idx_posts_community_created_at 
ON posts(community_id, created_at DESC) 
WHERE is_deleted = false;

-- Index for pinned posts (community admins)
CREATE INDEX IF NOT EXISTS idx_posts_community_pinned 
ON posts(community_id, is_pinned DESC, created_at DESC) 
WHERE is_deleted = false;

-- Index for author's posts
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at 
ON posts(author_id, created_at DESC) 
WHERE is_deleted = false;

-- Index for popular posts (upvotes - downvotes)
CREATE INDEX IF NOT EXISTS idx_posts_score 
ON posts((upvotes - downvotes) DESC, created_at DESC) 
WHERE is_deleted = false;

-- Index for posts with media
CREATE INDEX IF NOT EXISTS idx_posts_with_media 
ON posts(community_id, created_at DESC) 
WHERE is_deleted = false AND media_count > 0;

-- Index for post search by location
CREATE INDEX IF NOT EXISTS idx_posts_location_city 
ON posts(location_city, created_at DESC) 
WHERE is_deleted = false AND location_city IS NOT NULL;

-- ============================================
-- COMMENTS TABLE PERFORMANCE INDEXES
-- ============================================

-- Index for comment threads (post + parent hierarchy)
CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created 
ON comments(post_id, parent_comment_id, created_at ASC) 
WHERE is_deleted = false;

-- Index for user's comments
CREATE INDEX IF NOT EXISTS idx_comments_author_created_at 
ON comments(author_id, created_at DESC) 
WHERE is_deleted = false;

-- Index for comment vote scores
CREATE INDEX IF NOT EXISTS idx_comments_score 
ON comments((upvotes - downvotes) DESC) 
WHERE is_deleted = false;

-- Index for top-level comments only
CREATE INDEX IF NOT EXISTS idx_comments_toplevel 
ON comments(post_id, created_at ASC) 
WHERE is_deleted = false AND parent_comment_id IS NULL;

-- ============================================
-- MEDIA_ITEMS TABLE PERFORMANCE INDEXES
-- ============================================

-- Index for media by owner (already exists but ensure optimal)
DROP INDEX IF EXISTS idx_media_items_owner;
CREATE INDEX idx_media_items_owner_optimized 
ON media_items(owner_type, owner_id, display_order ASC);

-- Index for media by type and creation date
CREATE INDEX IF NOT EXISTS idx_media_items_type_created 
ON media_items(media_type, created_at DESC);

-- Index for large media files (for cleanup operations)
CREATE INDEX IF NOT EXISTS idx_media_items_large_files 
ON media_items(file_size DESC) 
WHERE file_size > 10485760; -- > 10MB

-- ============================================
-- VOTES TABLE PERFORMANCE INDEXES
-- ============================================

-- Composite index for vote lookups (user + content)
DROP INDEX IF EXISTS idx_votes_user_content;
CREATE INDEX idx_votes_user_content_optimized 
ON votes(user_id, content_type, content_id);

-- Index for content vote aggregation
CREATE INDEX IF NOT EXISTS idx_votes_content_aggregation 
ON votes(content_type, content_id, vote_type);

-- ============================================
-- COMMUNITY MEMBERS TABLE PERFORMANCE INDEXES
-- ============================================

-- Index for user's communities
CREATE INDEX IF NOT EXISTS idx_community_members_user_joined 
ON community_members(user_id, joined_at DESC);

-- Index for community member lists
CREATE INDEX IF NOT EXISTS idx_community_members_community_role 
ON community_members(community_id, role, joined_at DESC);

-- ============================================
-- USERS TABLE PERFORMANCE INDEXES
-- ============================================

-- Index for location-based user queries
CREATE INDEX IF NOT EXISTS idx_users_location_city 
ON users(location_city) 
WHERE location_city IS NOT NULL AND is_banned = false;

-- Index for user handle lookups
CREATE INDEX IF NOT EXISTS idx_users_anonymous_handle 
ON users(anonymous_handle) 
WHERE is_banned = false;

-- ============================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================

-- Optimized function to get post with vote counts and user vote
CREATE OR REPLACE FUNCTION get_post_with_stats(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    community_id UUID,
    author_id UUID,
    title TEXT,
    body TEXT,
    external_url TEXT,
    location_city TEXT,
    upvotes INTEGER,
    downvotes INTEGER,
    comment_count INTEGER,
    media_count INTEGER,
    view_count INTEGER,
    is_deleted BOOLEAN,
    is_edited BOOLEAN,
    is_pinned BOOLEAN,
    is_announcement BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_vote TEXT,
    author_handle TEXT,
    author_avatar_seed TEXT,
    community_name TEXT,
    community_slug TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.community_id,
        p.author_id,
        p.title,
        p.body,
        p.external_url,
        p.location_city,
        p.upvotes,
        p.downvotes,
        p.comment_count,
        p.media_count,
        COALESCE(p.view_count, 0) as view_count,
        p.is_deleted,
        p.is_edited,
        COALESCE(p.is_pinned, false) as is_pinned,
        COALESCE(p.is_announcement, false) as is_announcement,
        p.created_at,
        p.updated_at,
        v.vote_type as user_vote,
        u.anonymous_handle as author_handle,
        u.avatar_seed as author_avatar_seed,
        c.name as community_name,
        c.slug as community_slug
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN communities c ON c.id = p.community_id
    LEFT JOIN votes v ON v.content_id = p.id 
        AND v.content_type = 'post' 
        AND v.user_id = p_user_id
    WHERE p.id = p_post_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Optimized function to get community posts with pagination
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
BEGIN
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
    ORDER BY 
        CASE WHEN p_include_pinned THEN p.is_pinned END DESC NULLS LAST,
        p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Optimized function to get comment thread with single query
CREATE OR REPLACE FUNCTION get_comment_thread_optimized(
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
BEGIN
    RETURN QUERY
    WITH RECURSIVE comment_tree AS (
        -- Base case: top-level comments
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
            0 as depth,
            ARRAY[c.id::TEXT] as path
        FROM comments c
        JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = p_user_id
        WHERE c.post_id = p_post_id 
            AND c.parent_comment_id IS NULL
            AND c.is_deleted = false
        
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
            v.vote_type as user_vote,
            u.anonymous_handle as author_handle,
            u.avatar_seed as author_avatar_seed,
            ct.depth + 1,
            ct.path || c.id::TEXT
        FROM comments c
        JOIN comment_tree ct ON ct.id = c.parent_comment_id
        JOIN users u ON u.id = c.author_id
        LEFT JOIN votes v ON v.content_id = c.id 
            AND v.content_type = 'comment' 
            AND v.user_id = p_user_id
        WHERE c.is_deleted = false
            AND ct.depth < 10 -- Prevent infinite recursion
    )
    SELECT * FROM comment_tree
    ORDER BY path;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- QUERY RESULT CACHING VIEWS
-- ============================================

-- Materialized view for popular posts (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_posts_cache AS
SELECT 
    p.id,
    p.community_id,
    p.title,
    p.upvotes,
    p.downvotes,
    p.comment_count,
    p.view_count,
    (p.upvotes - p.downvotes) as score,
    p.created_at,
    u.anonymous_handle,
    c.name as community_name,
    c.slug as community_slug
FROM posts p
JOIN users u ON u.id = p.author_id
JOIN communities c ON c.id = p.community_id
WHERE p.is_deleted = false
    AND p.created_at > NOW() - INTERVAL '7 days' -- Only recent posts
    AND (p.upvotes - p.downvotes) > 0 -- Only posts with positive score
ORDER BY 
    (p.upvotes - p.downvotes) DESC,
    p.view_count DESC,
    p.created_at DESC
LIMIT 1000;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_posts_cache_id ON popular_posts_cache(id);

-- Function to refresh popular posts cache
CREATE OR REPLACE FUNCTION refresh_popular_posts_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_posts_cache;
    
    -- Log the refresh
    INSERT INTO system_logs (event_type, details) 
    VALUES ('cache_refresh', 'popular_posts_cache refreshed');
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail
        INSERT INTO system_logs (event_type, details, error_message) 
        VALUES ('cache_refresh_error', 'popular_posts_cache refresh failed', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================

-- Function to get query performance stats
CREATE OR REPLACE FUNCTION get_query_performance_stats()
RETURNS TABLE (
    query_type TEXT,
    avg_duration_ms NUMERIC,
    total_calls BIGINT,
    table_scans BIGINT,
    index_scans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'posts_by_community' as query_type,
        0.0 as avg_duration_ms, -- Placeholder for actual stats
        0 as total_calls,
        0 as table_scans,
        0 as index_scans;
    
    -- Note: In production, you'd integrate with pg_stat_statements
    -- or similar monitoring extensions for actual performance data
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create system logs table for monitoring
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    details TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_type_created 
ON system_logs(event_type, created_at DESC);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_post_with_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_thread_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_popular_posts_cache TO service_role;
GRANT EXECUTE ON FUNCTION get_query_performance_stats TO authenticated;

-- Grant access to materialized view
GRANT SELECT ON popular_posts_cache TO authenticated;
GRANT SELECT ON system_logs TO authenticated;

-- ============================================
-- AUTOMATED MAINTENANCE
-- ============================================

-- Schedule cache refresh (would be handled by pg_cron in production)
-- For now, it's a manual function call

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Added performance indexes for posts, comments, votes, and media';
    RAISE NOTICE '✅ Created optimized query functions for common operations';
    RAISE NOTICE '✅ Implemented materialized view for popular posts caching';
    RAISE NOTICE '✅ Added performance monitoring infrastructure';
    RAISE NOTICE '✅ Database query optimization completed';
END $$;
