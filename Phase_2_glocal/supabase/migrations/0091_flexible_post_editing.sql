-- ============================================
-- FLEXIBLE POST EDITING SYSTEM
-- ============================================
-- Add community-configurable edit limits and edit history tracking
-- Version: 0091
-- Description: Enhanced post editing with history and flexible time limits
-- Date: 2025-01-28

-- ============================================
-- CREATE ENUM TYPES FIRST
-- ============================================

-- Create enum for edit types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_edit_type') THEN
        CREATE TYPE post_edit_type AS ENUM (
            'content',      -- Title/body changes
            'media',        -- Media additions/removals
            'metadata',     -- Tags, location, etc.
            'moderation'    -- Moderator/admin edits
        );
    END IF;
END $$;

-- ============================================
-- COMMUNITY EDIT CONFIGURATION
-- ============================================

-- Add edit configuration columns to communities table
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS edit_time_limit_minutes INTEGER DEFAULT 60, -- 1 hour default
ADD COLUMN IF NOT EXISTS allow_unlimited_author_edit_hours INTEGER DEFAULT 24, -- 24 hours for authors
ADD COLUMN IF NOT EXISTS allow_moderator_edit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_admin_edit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS edit_history_visible BOOLEAN DEFAULT true;

-- ============================================
-- POST EDIT HISTORY TABLE
-- ============================================

-- Create table for tracking post edit history
CREATE TABLE IF NOT EXISTS post_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    editor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_title TEXT,
    previous_body TEXT,
    previous_external_url TEXT,
    edit_reason TEXT,
    edit_type post_edit_type DEFAULT 'content',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for edit history
CREATE INDEX IF NOT EXISTS idx_post_edit_history_post_id 
ON post_edit_history(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_edit_history_editor 
ON post_edit_history(editor_id, created_at DESC);

-- ============================================
-- COMMENT EDIT HISTORY TABLE
-- ============================================

-- Create table for tracking comment edit history
CREATE TABLE IF NOT EXISTS comment_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    editor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_body TEXT NOT NULL,
    edit_reason TEXT,
    edit_type post_edit_type DEFAULT 'content',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for comment edit history
CREATE INDEX IF NOT EXISTS idx_comment_edit_history_comment_id 
ON comment_edit_history(comment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_edit_history_editor 
ON comment_edit_history(editor_id, created_at DESC);

-- ============================================
-- ENHANCED EDIT PERMISSION FUNCTIONS
-- ============================================

-- Function to check if user can edit a post based on community rules
CREATE OR REPLACE FUNCTION can_user_edit_post(
    p_post_id UUID,
    p_user_id UUID
) RETURNS TABLE (
    can_edit BOOLEAN,
    reason TEXT,
    time_remaining_minutes INTEGER
) AS $$
DECLARE
    post_record RECORD;
    community_record RECORD;
    user_role TEXT;
    minutes_since_creation INTEGER;
    minutes_since_last_edit INTEGER;
BEGIN
    -- Get post information
    SELECT p.*, u.id as author_id 
    INTO post_record
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.id = p_post_id AND p.is_deleted = false;
    
    IF post_record IS NULL THEN
        RETURN QUERY SELECT false, 'Post not found or deleted', 0;
        RETURN;
    END IF;
    
    -- Get community configuration
    SELECT * INTO community_record
    FROM communities 
    WHERE id = post_record.community_id;
    
    -- Get user's role in the community
    SELECT role INTO user_role
    FROM community_members
    WHERE community_id = post_record.community_id 
        AND user_id = p_user_id;
    
    IF user_role IS NULL THEN
        RETURN QUERY SELECT false, 'Not a community member', 0;
        RETURN;
    END IF;
    
    -- Calculate time since creation and last edit
    minutes_since_creation := EXTRACT(EPOCH FROM (NOW() - post_record.created_at)) / 60;
    minutes_since_last_edit := EXTRACT(EPOCH FROM (NOW() - post_record.updated_at)) / 60;
    
    -- Admin and moderator permissions
    IF user_role = 'admin' AND community_record.allow_admin_edit THEN
        RETURN QUERY SELECT true, 'Admin privileges', -1;
        RETURN;
    END IF;
    
    IF user_role = 'moderator' AND community_record.allow_moderator_edit THEN
        RETURN QUERY SELECT true, 'Moderator privileges', -1;
        RETURN;
    END IF;
    
    -- Check if user is the post author
    IF post_record.author_id = p_user_id THEN
        -- Check unlimited author edit window (usually first 24 hours)
        IF minutes_since_creation <= (community_record.allow_unlimited_author_edit_hours * 60) THEN
            RETURN QUERY SELECT 
                true, 
                'Author unlimited edit period', 
                (community_record.allow_unlimited_author_edit_hours * 60) - minutes_since_creation;
            RETURN;
        END IF;
        
        -- Check regular edit time limit
        IF minutes_since_last_edit <= community_record.edit_time_limit_minutes THEN
            RETURN QUERY SELECT 
                true, 
                'Within edit time limit', 
                community_record.edit_time_limit_minutes - minutes_since_last_edit;
            RETURN;
        END IF;
        
        -- Time limit exceeded
        RETURN QUERY SELECT 
            false, 
            'Edit time limit exceeded', 
            0;
        RETURN;
    END IF;
    
    -- Not the author and not a moderator/admin
    RETURN QUERY SELECT false, 'Only post author can edit', 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to save post edit history
CREATE OR REPLACE FUNCTION save_post_edit_history(
    p_post_id UUID,
    p_editor_id UUID,
    p_previous_title TEXT,
    p_previous_body TEXT,
    p_previous_external_url TEXT,
    p_edit_reason TEXT DEFAULT NULL,
    p_edit_type post_edit_type DEFAULT 'content'
) RETURNS UUID AS $$
DECLARE
    edit_history_id UUID;
BEGIN
    INSERT INTO post_edit_history (
        post_id,
        editor_id,
        previous_title,
        previous_body,
        previous_external_url,
        edit_reason,
        edit_type
    ) VALUES (
        p_post_id,
        p_editor_id,
        p_previous_title,
        p_previous_body,
        p_previous_external_url,
        p_edit_reason,
        p_edit_type
    ) RETURNING id INTO edit_history_id;
    
    RETURN edit_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save comment edit history
CREATE OR REPLACE FUNCTION save_comment_edit_history(
    p_comment_id UUID,
    p_editor_id UUID,
    p_previous_body TEXT,
    p_edit_reason TEXT DEFAULT NULL,
    p_edit_type post_edit_type DEFAULT 'content'
) RETURNS UUID AS $$
DECLARE
    edit_history_id UUID;
BEGIN
    INSERT INTO comment_edit_history (
        comment_id,
        editor_id,
        previous_body,
        edit_reason,
        edit_type
    ) VALUES (
        p_comment_id,
        p_editor_id,
        p_previous_body,
        p_edit_reason,
        p_edit_type
    ) RETURNING id INTO edit_history_id;
    
    RETURN edit_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get post edit history
CREATE OR REPLACE FUNCTION get_post_edit_history(
    p_post_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    id UUID,
    editor_handle TEXT,
    editor_avatar_seed TEXT,
    previous_title TEXT,
    previous_body TEXT,
    previous_external_url TEXT,
    edit_reason TEXT,
    edit_type post_edit_type,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        peh.id,
        u.anonymous_handle as editor_handle,
        u.avatar_seed as editor_avatar_seed,
        peh.previous_title,
        peh.previous_body,
        peh.previous_external_url,
        peh.edit_reason,
        peh.edit_type,
        peh.created_at
    FROM post_edit_history peh
    JOIN users u ON u.id = peh.editor_id
    WHERE peh.post_id = p_post_id
    ORDER BY peh.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR AUTOMATIC EDIT HISTORY
-- ============================================

-- Trigger function to automatically save post edit history
CREATE OR REPLACE FUNCTION trigger_save_post_edit_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only save history if content actually changed
    IF (OLD.title IS DISTINCT FROM NEW.title) OR 
       (OLD.body IS DISTINCT FROM NEW.body) OR 
       (OLD.external_url IS DISTINCT FROM NEW.external_url) THEN
        
        -- Save the previous version to history
        PERFORM save_post_edit_history(
            NEW.id,
            NEW.author_id, -- This will be updated to actual editor in API
            OLD.title,
            OLD.body,
            OLD.external_url,
            NULL, -- edit_reason will be provided by API
            'content'
        );
        
        -- Mark post as edited
        NEW.is_edited := true;
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post edits
DROP TRIGGER IF EXISTS trigger_post_edit_history ON posts;
CREATE TRIGGER trigger_post_edit_history
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_save_post_edit_history();

-- Trigger function for comment edit history
CREATE OR REPLACE FUNCTION trigger_save_comment_edit_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only save history if body changed
    IF OLD.body IS DISTINCT FROM NEW.body THEN
        
        -- Save the previous version to history
        PERFORM save_comment_edit_history(
            NEW.id,
            NEW.author_id, -- This will be updated to actual editor in API
            OLD.body,
            NULL, -- edit_reason will be provided by API
            'content'
        );
        
        -- Mark comment as edited
        NEW.is_edited := true;
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment edits
DROP TRIGGER IF EXISTS trigger_comment_edit_history ON comments;
CREATE TRIGGER trigger_comment_edit_history
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_save_comment_edit_history();

-- ============================================
-- RLS POLICIES FOR EDIT HISTORY
-- ============================================

-- Enable RLS on edit history tables
ALTER TABLE post_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_edit_history ENABLE ROW LEVEL SECURITY;

-- Policy for viewing post edit history (community members only if history is visible)
CREATE POLICY "Community members can view post edit history" ON post_edit_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM posts p
            JOIN communities c ON c.id = p.community_id
            JOIN community_members cm ON cm.community_id = c.id
            WHERE p.id = post_edit_history.post_id
                AND cm.user_id = auth.uid()
                AND c.edit_history_visible = true
        )
    );

-- Policy for viewing comment edit history (community members only)
CREATE POLICY "Community members can view comment edit history" ON comment_edit_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM comments com
            JOIN posts p ON p.id = com.post_id
            JOIN community_members cm ON cm.community_id = p.community_id
            WHERE com.id = comment_edit_history.comment_id
                AND cm.user_id = auth.uid()
        )
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION can_user_edit_post TO authenticated;
GRANT EXECUTE ON FUNCTION save_post_edit_history TO authenticated;
GRANT EXECUTE ON FUNCTION save_comment_edit_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_edit_history TO authenticated;

-- Grant access to edit history tables
GRANT SELECT ON post_edit_history TO authenticated;
GRANT SELECT ON comment_edit_history TO authenticated;

-- ============================================
-- DEFAULT COMMUNITY SETTINGS
-- ============================================

-- Update existing communities with sensible defaults
UPDATE communities 
SET 
    edit_time_limit_minutes = 60,           -- 1 hour edit window
    allow_unlimited_author_edit_hours = 24, -- 24 hours unlimited for authors
    allow_moderator_edit = true,
    allow_admin_edit = true,
    edit_history_visible = true
WHERE edit_time_limit_minutes IS NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Added community-configurable edit time limits';
    RAISE NOTICE '✅ Created post and comment edit history tracking';
    RAISE NOTICE '✅ Implemented flexible edit permission system';
    RAISE NOTICE '✅ Added automatic edit history triggers';
    RAISE NOTICE '✅ Flexible post editing system is ready';
END $$;
