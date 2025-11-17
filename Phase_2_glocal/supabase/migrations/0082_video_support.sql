-- Video Support Migration
-- Version: 0082
-- Description: Add video support to posts table
-- Date: 2025-01-27

-- Extend media_type enum to include video
ALTER TYPE media_type ADD VALUE 'video';

-- Add video columns to posts table
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_thumbnail TEXT,
  ADD COLUMN IF NOT EXISTS video_duration INTEGER,
  ADD COLUMN IF NOT EXISTS video_variants JSONB;

-- Create index on media_type for video filtering
CREATE INDEX IF NOT EXISTS idx_posts_media_type_video ON posts(media_type) WHERE media_type = 'video';

-- Add comments for new columns
COMMENT ON COLUMN posts.video_url IS 'Primary video URL stored in theglocal-videos bucket';
COMMENT ON COLUMN posts.video_thumbnail IS 'Generated thumbnail URL for video preview';
COMMENT ON COLUMN posts.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN posts.video_variants IS 'JSON object for future quality variants: {original, compressed, thumbnail}';

-- Update RLS policies to include video content
-- Video posts follow the same visibility rules as other posts
-- No additional RLS changes needed as existing policies cover all post content
