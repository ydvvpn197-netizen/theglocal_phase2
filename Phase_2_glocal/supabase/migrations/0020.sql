-- Add external_url column to posts table for storing source URLs of shared content
-- This enables better UX for news sharing and external content references

ALTER TABLE posts 
ADD COLUMN external_url TEXT;

-- Add index for performance when querying by external_url
CREATE INDEX idx_posts_external_url ON posts(external_url) WHERE external_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN posts.external_url IS 'External URL for shared content (news, articles, etc.)';
