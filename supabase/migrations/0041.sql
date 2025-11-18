-- Add enhanced media support to posts table
-- This migration adds support for multiple image sizes, formats, and GIF handling

-- Create media type enum
CREATE TYPE media_type AS ENUM ('image', 'gif');

-- Add new columns to posts table
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS media_type media_type,
  ADD COLUMN IF NOT EXISTS media_variants JSONB,
  ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Create index on media_type for faster queries
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type);

-- Add comments for documentation
COMMENT ON COLUMN posts.media_type IS 'Type of media attached to the post';
COMMENT ON COLUMN posts.media_variants IS 'JSON object containing URLs for different image sizes and formats: {original, large, medium, thumbnail, webp: {large, medium, thumbnail}}';
COMMENT ON COLUMN posts.gif_url IS 'External GIF URL from Giphy/Tenor or uploaded GIF URL';

-- Note: image_url column is kept for backward compatibility
COMMENT ON COLUMN posts.image_url IS 'Legacy image URL field - kept for backward compatibility. New posts use media_variants.';

