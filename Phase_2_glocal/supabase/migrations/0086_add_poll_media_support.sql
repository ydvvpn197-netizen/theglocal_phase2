-- Add Media Support to Polls
-- Version: 0086
-- Description: Add media fields to polls table to support images, videos, and GIFs
-- Date: 2025-01-28

SET search_path TO public;

-- ============================================
-- PART 1: ADD MEDIA COLUMNS TO POLLS TABLE
-- ============================================

-- Add media type column
ALTER TABLE polls ADD COLUMN IF NOT EXISTS media_type media_type;

-- Add media variants column for image/video processing
ALTER TABLE polls ADD COLUMN IF NOT EXISTS media_variants JSONB;

-- Add GIF URL column for external GIF support
ALTER TABLE polls ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Add image URL column for backward compatibility
ALTER TABLE polls ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================
-- PART 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Create index on media_type for faster queries
CREATE INDEX IF NOT EXISTS idx_polls_media_type ON polls(media_type);

-- Create index on polls with media for filtering
CREATE INDEX IF NOT EXISTS idx_polls_with_media ON polls(id) WHERE media_type IS NOT NULL;

-- ============================================
-- PART 3: ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN polls.media_type IS 'Type of media attached to the poll: image, video, or gif';
COMMENT ON COLUMN polls.media_variants IS 'JSON object containing URLs for different image/video sizes and formats: {original, large, medium, thumbnail, webp: {large, medium, thumbnail}}';
COMMENT ON COLUMN polls.gif_url IS 'External GIF URL from Giphy/Tenor or uploaded GIF URL';
COMMENT ON COLUMN polls.image_url IS 'Image URL for polls with image media_type';

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll media support migration complete!';
  RAISE NOTICE '✅ Added media_type column to polls table';
  RAISE NOTICE '✅ Added media_variants column for processed media';
  RAISE NOTICE '✅ Added gif_url column for GIF support';
  RAISE NOTICE '✅ Added image_url column for image support';
  RAISE NOTICE '✅ Created performance indexes for media queries';
  RAISE NOTICE '📝 Migration 0086 complete - Polls now support media attachments';
END$$;
