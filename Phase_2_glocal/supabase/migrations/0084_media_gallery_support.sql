-- ============================================
-- MEDIA GALLERY SUPPORT MIGRATION
-- ============================================
-- Add support for multiple media items per post/comment
-- Created: 2025-01-27

-- Create media type enum (extend existing if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
        CREATE TYPE media_type AS ENUM ('image', 'video', 'gif');
    ELSE
        -- Add video to existing enum if not present
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'video' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'media_type')) THEN
            ALTER TYPE media_type ADD VALUE 'video';
        END IF;
    END IF;
END $$;

-- Create media_items table for storing individual media files
CREATE TABLE IF NOT EXISTS media_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_type TEXT NOT NULL CHECK (owner_type IN ('post', 'comment', 'poll_comment')),
    owner_id UUID NOT NULL,
    media_type media_type NOT NULL,
    url TEXT NOT NULL,
    variants JSONB, -- {original, large, medium, thumbnail, webp: {large, medium, thumbnail}}
    display_order INTEGER NOT NULL DEFAULT 0,
    duration INTEGER, -- Duration in seconds for videos
    thumbnail_url TEXT, -- For videos and GIFs
    file_size BIGINT, -- File size in bytes
    mime_type TEXT,
    alt_text TEXT, -- Accessibility
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add check constraints for referential integrity
-- Note: We'll handle cascade deletes at the application level or with triggers
ALTER TABLE media_items 
ADD CONSTRAINT chk_media_items_owner_type 
CHECK (owner_type IN ('post', 'comment', 'poll_comment'));

-- Create a function to validate owner_id exists in the appropriate table
CREATE OR REPLACE FUNCTION validate_media_item_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_type = 'post' THEN
        IF NOT EXISTS (SELECT 1 FROM posts WHERE id = NEW.owner_id) THEN
            RAISE EXCEPTION 'Referenced post does not exist';
        END IF;
    ELSIF NEW.owner_type = 'comment' THEN
        IF NOT EXISTS (SELECT 1 FROM comments WHERE id = NEW.owner_id) THEN
            RAISE EXCEPTION 'Referenced comment does not exist';
        END IF;
    ELSIF NEW.owner_type = 'poll_comment' THEN
        IF NOT EXISTS (SELECT 1 FROM poll_comments WHERE id = NEW.owner_id) THEN
            RAISE EXCEPTION 'Referenced poll_comment does not exist';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate owner_id
CREATE TRIGGER trigger_validate_media_item_owner
    BEFORE INSERT OR UPDATE ON media_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_media_item_owner();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_items_owner ON media_items(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_media_items_display_order ON media_items(owner_type, owner_id, display_order);
CREATE INDEX IF NOT EXISTS idx_media_items_media_type ON media_items(media_type);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at DESC);

-- Add media_count columns to existing tables
DO $$ 
BEGIN
    -- Add media_count to posts table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_count' AND table_schema = 'public') THEN
            ALTER TABLE posts ADD COLUMN media_count INTEGER DEFAULT 0;
        END IF;
    END IF;
    
    -- Add media_count to comments table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'media_count' AND table_schema = 'public') THEN
            ALTER TABLE comments ADD COLUMN media_count INTEGER DEFAULT 0;
        END IF;
    END IF;
    
    -- Add media_count to poll_comments table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poll_comments' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'poll_comments' AND column_name = 'media_count' AND table_schema = 'public') THEN
            ALTER TABLE poll_comments ADD COLUMN media_count INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Create function to update media count
CREATE OR REPLACE FUNCTION update_media_count()
RETURNS TRIGGER AS $$
DECLARE
    target_table TEXT;
    target_id UUID;
BEGIN
    -- Determine which table to update based on owner_type
    IF TG_OP = 'INSERT' THEN
        target_table := NEW.owner_type;
        target_id := NEW.owner_id;
    ELSIF TG_OP = 'DELETE' THEN
        target_table := OLD.owner_type;
        target_id := OLD.owner_id;
    END IF;
    
    -- Update the appropriate table's media_count
    IF target_table = 'post' THEN
        UPDATE posts 
        SET media_count = (
            SELECT COUNT(*) 
            FROM media_items 
            WHERE owner_type = 'post' AND owner_id = target_id
        )
        WHERE id = target_id;
    ELSIF target_table = 'comment' THEN
        UPDATE comments 
        SET media_count = (
            SELECT COUNT(*) 
            FROM media_items 
            WHERE owner_type = 'comment' AND owner_id = target_id
        )
        WHERE id = target_id;
    ELSIF target_table = 'poll_comment' THEN
        UPDATE poll_comments 
        SET media_count = (
            SELECT COUNT(*) 
            FROM media_items 
            WHERE owner_type = 'poll_comment' AND owner_id = target_id
        )
        WHERE id = target_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update media count
CREATE TRIGGER trigger_update_media_count
    AFTER INSERT OR DELETE ON media_items
    FOR EACH ROW
    EXECUTE FUNCTION update_media_count();

-- Create function to handle cascade delete of media items
CREATE OR REPLACE FUNCTION cascade_delete_media_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete media items when the parent record is deleted
    IF TG_TABLE_NAME = 'posts' THEN
        DELETE FROM media_items WHERE owner_type = 'post' AND owner_id = OLD.id;
    ELSIF TG_TABLE_NAME = 'comments' THEN
        DELETE FROM media_items WHERE owner_type = 'comment' AND owner_id = OLD.id;
    ELSIF TG_TABLE_NAME = 'poll_comments' THEN
        DELETE FROM media_items WHERE owner_type = 'poll_comment' AND owner_id = OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for cascade delete
CREATE TRIGGER trigger_cascade_delete_posts_media
    AFTER DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION cascade_delete_media_items();

CREATE TRIGGER trigger_cascade_delete_comments_media
    AFTER DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION cascade_delete_media_items();

CREATE TRIGGER trigger_cascade_delete_poll_comments_media
    AFTER DELETE ON poll_comments
    FOR EACH ROW
    EXECUTE FUNCTION cascade_delete_media_items();

-- Enable RLS on media_items table
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_items
-- Users can view media on posts/comments they can access
CREATE POLICY "Users can view media on accessible content" ON media_items
    FOR SELECT
    USING (
        (owner_type = 'post' AND EXISTS (
            SELECT 1 FROM posts p
            JOIN community_members cm ON cm.community_id = p.community_id
            WHERE p.id = media_items.owner_id 
            AND cm.user_id = auth.uid()
        )) OR
        (owner_type = 'comment' AND EXISTS (
            SELECT 1 FROM comments c
            JOIN posts p ON p.id = c.post_id
            JOIN community_members cm ON cm.community_id = p.community_id
            WHERE c.id = media_items.owner_id 
            AND cm.user_id = auth.uid()
        )) OR
        (owner_type = 'poll_comment' AND EXISTS (
            SELECT 1 FROM poll_comments pc
            JOIN polls po ON po.id = pc.poll_id
            JOIN community_members cm ON cm.community_id = po.community_id
            WHERE pc.id = media_items.owner_id 
            AND cm.user_id = auth.uid()
        ))
    );

-- Users can insert media on their own posts/comments
CREATE POLICY "Users can insert media on own content" ON media_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (owner_type = 'post' AND EXISTS (
            SELECT 1 FROM posts WHERE id = owner_id AND author_id = auth.uid()
        )) OR
        (owner_type = 'comment' AND EXISTS (
            SELECT 1 FROM comments WHERE id = owner_id AND author_id = auth.uid()
        )) OR
        (owner_type = 'poll_comment' AND EXISTS (
            SELECT 1 FROM poll_comments WHERE id = owner_id AND author_id = auth.uid()
        ))
    );

-- Users can delete media on their own posts/comments
CREATE POLICY "Users can delete media on own content" ON media_items
    FOR DELETE
    USING (
        (owner_type = 'post' AND EXISTS (
            SELECT 1 FROM posts WHERE id = owner_id AND author_id = auth.uid()
        )) OR
        (owner_type = 'comment' AND EXISTS (
            SELECT 1 FROM comments WHERE id = owner_id AND author_id = auth.uid()
        )) OR
        (owner_type = 'poll_comment' AND EXISTS (
            SELECT 1 FROM poll_comments WHERE id = owner_id AND author_id = auth.uid()
        ))
    );

-- Add comments for documentation
COMMENT ON TABLE media_items IS 'Stores individual media files (images, videos, GIFs) attached to posts and comments';
COMMENT ON COLUMN media_items.owner_type IS 'Type of content this media belongs to: post, comment, or poll_comment';
COMMENT ON COLUMN media_items.owner_id IS 'ID of the post, comment, or poll_comment this media belongs to';
COMMENT ON COLUMN media_items.media_type IS 'Type of media: image, video, or gif';
COMMENT ON COLUMN media_items.variants IS 'JSON object containing URLs for different image sizes and formats';
COMMENT ON COLUMN media_items.display_order IS 'Order in which media items should be displayed (0-based)';
COMMENT ON COLUMN media_items.duration IS 'Duration in seconds for videos';
COMMENT ON COLUMN media_items.thumbnail_url IS 'Thumbnail image URL for videos and GIFs';
COMMENT ON COLUMN media_items.alt_text IS 'Alternative text for accessibility';

-- Grant permissions
GRANT ALL ON media_items TO authenticated;
GRANT ALL ON media_items TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Created media_items table with gallery support';
    RAISE NOTICE '✅ Added media_count columns to posts, comments, and poll_comments';
    RAISE NOTICE '✅ Created RLS policies for media access control';
    RAISE NOTICE '✅ Added automatic media count tracking triggers';
END $$;
