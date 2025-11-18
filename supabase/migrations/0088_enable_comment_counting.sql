-- ============================================
-- RE-ENABLE COMMENT COUNTING SYSTEM
-- ============================================
-- Fix comment count tracking with proper triggers
-- Version: 0088
-- Description: Re-enable automatic comment count updates and add manual recalculation
-- Date: 2025-01-28

-- ============================================
-- COMMENT COUNT TRIGGER FUNCTIONS
-- ============================================

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
DECLARE
    target_post_id UUID;
    new_count INTEGER;
BEGIN
    -- Determine which post to update
    IF TG_OP = 'INSERT' THEN
        target_post_id := NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        target_post_id := OLD.post_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle case where post_id changes (shouldn't happen but be safe)
        IF OLD.post_id != NEW.post_id THEN
            -- Update both old and new post counts
            UPDATE posts 
            SET comment_count = (
                SELECT COUNT(*) 
                FROM comments 
                WHERE post_id = OLD.post_id AND is_deleted = false
            )
            WHERE id = OLD.post_id;
            
            target_post_id := NEW.post_id;
        ELSE
            target_post_id := NEW.post_id;
        END IF;
    END IF;
    
    -- Calculate new comment count (exclude deleted comments)
    SELECT COUNT(*) INTO new_count
    FROM comments 
    WHERE post_id = target_post_id AND is_deleted = false;
    
    -- Update the post's comment count
    UPDATE posts 
    SET comment_count = new_count,
        updated_at = NOW()
    WHERE id = target_post_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comment count when is_deleted changes
CREATE OR REPLACE FUNCTION update_comment_deleted_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if is_deleted status actually changed
    IF OLD.is_deleted != NEW.is_deleted THEN
        -- Update the post's comment count
        UPDATE posts 
        SET comment_count = (
            SELECT COUNT(*) 
            FROM comments 
            WHERE post_id = NEW.post_id AND is_deleted = false
        ),
        updated_at = NOW()
        WHERE id = NEW.post_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE COMMENT COUNT TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_post_comment_count_insert ON comments;
DROP TRIGGER IF EXISTS trigger_update_post_comment_count_delete ON comments;
DROP TRIGGER IF EXISTS trigger_update_post_comment_count_update ON comments;
DROP TRIGGER IF EXISTS trigger_update_comment_deleted_status ON comments;

-- Trigger for INSERT (new comments)
CREATE TRIGGER trigger_update_post_comment_count_insert
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comment_count();

-- Trigger for DELETE (permanently deleted comments)
CREATE TRIGGER trigger_update_post_comment_count_delete
    AFTER DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comment_count();

-- Trigger for UPDATE when is_deleted status changes
CREATE TRIGGER trigger_update_comment_deleted_status
    AFTER UPDATE OF is_deleted ON comments
    FOR EACH ROW
    WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
    EXECUTE FUNCTION update_comment_deleted_status();

-- ============================================
-- MANUAL COMMENT COUNT RECALCULATION FUNCTION
-- ============================================

-- Function to manually recalculate comment counts for all posts
CREATE OR REPLACE FUNCTION recalculate_all_comment_counts()
RETURNS TABLE (
    posts_updated INTEGER,
    total_comments INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    posts_count INTEGER;
    comments_count INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    -- Update all post comment counts
    UPDATE posts 
    SET comment_count = subquery.count,
        updated_at = NOW()
    FROM (
        SELECT p.id, COALESCE(c.count, 0) as count
        FROM posts p
        LEFT JOIN (
            SELECT post_id, COUNT(*) as count
            FROM comments 
            WHERE is_deleted = false
            GROUP BY post_id
        ) c ON p.id = c.post_id
    ) subquery
    WHERE posts.id = subquery.id;
    
    GET DIAGNOSTICS posts_count = ROW_COUNT;
    
    -- Get total comment count
    SELECT COUNT(*) INTO comments_count FROM comments WHERE is_deleted = false;
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        posts_count,
        comments_count,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate comment count for a specific post
CREATE OR REPLACE FUNCTION recalculate_post_comment_count(post_id UUID)
RETURNS TABLE (
    old_count INTEGER,
    new_count INTEGER,
    updated BOOLEAN
) AS $$
DECLARE
    current_count INTEGER;
    calculated_count INTEGER;
BEGIN
    -- Get current count from post
    SELECT comment_count INTO current_count FROM posts WHERE id = post_id;
    
    IF current_count IS NULL THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, FALSE;
        RETURN;
    END IF;
    
    -- Calculate actual count
    SELECT COUNT(*) INTO calculated_count 
    FROM comments 
    WHERE post_id = recalculate_post_comment_count.post_id AND is_deleted = false;
    
    -- Update if different
    IF current_count != calculated_count THEN
        UPDATE posts 
        SET comment_count = calculated_count,
            updated_at = NOW()
        WHERE id = recalculate_post_comment_count.post_id;
        
        RETURN QUERY SELECT current_count, calculated_count, TRUE;
    ELSE
        RETURN QUERY SELECT current_count, calculated_count, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL COMMENT COUNT SYNCHRONIZATION
-- ============================================

-- Recalculate all comment counts to ensure consistency
DO $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM recalculate_all_comment_counts();
    RAISE NOTICE '✅ Recalculated comment counts for % posts (% total comments) in % ms', 
        result.posts_updated, result.total_comments, result.execution_time_ms;
END $$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION recalculate_all_comment_counts TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_post_comment_count TO authenticated;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for comment count queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_comments_post_id_deleted 
ON comments(post_id, is_deleted) 
WHERE is_deleted = false;

-- Index for post comment_count queries
CREATE INDEX IF NOT EXISTS idx_posts_comment_count 
ON posts(comment_count DESC) 
WHERE comment_count > 0;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Re-enabled comment counting system with triggers';
    RAISE NOTICE '✅ Added manual comment count recalculation functions';
    RAISE NOTICE '✅ Created performance indexes for comment counting';
    RAISE NOTICE '✅ Synchronized all existing comment counts';
    RAISE NOTICE '✅ Comment counting system is now fully operational';
END $$;
