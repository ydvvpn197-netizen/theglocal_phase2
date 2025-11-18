-- Migration: Add multiple media support for polls
-- Version: 0128
-- Description: Add 'poll' to media_items owner_type to support multiple media items per poll

SET search_path TO public;

-- ============================================
-- PART 1: ADD 'poll' TO OWNER_TYPE CHECK
-- ============================================

-- Drop the existing check constraint
ALTER TABLE media_items
DROP CONSTRAINT IF EXISTS chk_media_items_owner_type;

-- Add new check constraint that includes 'poll'
ALTER TABLE media_items
ADD CONSTRAINT chk_media_items_owner_type
CHECK (owner_type IN ('post', 'comment', 'poll_comment', 'poll'));

COMMENT ON COLUMN media_items.owner_type IS 'Type of content this media belongs to: post, comment, poll_comment, or poll';

-- ============================================
-- PART 2: UPDATE VALIDATION FUNCTION
-- ============================================

-- Update the validation function to include polls
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
            RAISE EXCEPTION 'Referenced poll comment does not exist';
        END IF;
    ELSIF NEW.owner_type = 'poll' THEN
        IF NOT EXISTS (SELECT 1 FROM polls WHERE id = NEW.owner_id) THEN
            RAISE EXCEPTION 'Referenced poll does not exist';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_media_item_owner IS 'Validates that the owner_id exists in the appropriate table based on owner_type';

-- ============================================
-- PART 3: UPDATE CASCADE DELETE TRIGGER
-- ============================================

-- Update the cascade delete trigger to include polls
CREATE OR REPLACE FUNCTION cascade_delete_media_items()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'posts' THEN
        DELETE FROM media_items WHERE owner_type = 'post' AND owner_id = OLD.id;
    ELSIF TG_TABLE_NAME = 'comments' THEN
        DELETE FROM media_items WHERE owner_type = 'comment' AND owner_id = OLD.id;
    ELSIF TG_TABLE_NAME = 'poll_comments' THEN
        DELETE FROM media_items WHERE owner_type = 'poll_comment' AND owner_id = OLD.id;
    ELSIF TG_TABLE_NAME = 'polls' THEN
        DELETE FROM media_items WHERE owner_type = 'poll' AND owner_id = OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cascade_delete_media_items IS 'Cascades delete of media items when parent content is deleted';

-- ============================================
-- PART 4: UPDATE RLS POLICIES
-- ============================================

-- Update RLS policies to include polls (if they exist)
-- Note: RLS policies may need to be updated separately if they reference owner_type

-- ============================================
-- PART 5: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll multiple media support added!';
  RAISE NOTICE '✅ Added poll to media_items owner_type';
  RAISE NOTICE '✅ Updated validation function to include polls';
  RAISE NOTICE '✅ Updated cascade delete trigger to include polls';
  RAISE NOTICE '📝 Migration 0128 complete';
END $$;

