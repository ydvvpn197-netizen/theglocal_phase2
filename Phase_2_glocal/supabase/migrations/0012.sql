-- User Profile Enhancements Migration
-- Version: 0012
-- Description: Add profile fields and user statistics functions
-- Date: 2025-10-11

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_preferences JSONB DEFAULT '{"show_karma": true, "show_location": true}'::jsonb;

-- Add constraint for bio length
ALTER TABLE users ADD CONSTRAINT bio_length_check CHECK (char_length(bio) <= 500);

-- Create function to calculate user post karma
CREATE OR REPLACE FUNCTION get_user_post_karma(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(upvotes - downvotes), 0)::INTEGER
  FROM posts
  WHERE author_id = user_uuid AND is_deleted = FALSE;
$$ LANGUAGE SQL STABLE;

-- Create function to calculate user comment karma
CREATE OR REPLACE FUNCTION get_user_comment_karma(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(upvotes - downvotes), 0)::INTEGER
  FROM comments
  WHERE author_id = user_uuid AND is_deleted = FALSE;
$$ LANGUAGE SQL STABLE;

-- Create function to count user posts
CREATE OR REPLACE FUNCTION get_user_post_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM posts
  WHERE author_id = user_uuid AND is_deleted = FALSE;
$$ LANGUAGE SQL STABLE;

-- Create function to count user comments
CREATE OR REPLACE FUNCTION get_user_comment_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM comments
  WHERE author_id = user_uuid AND is_deleted = FALSE;
$$ LANGUAGE SQL STABLE;

-- Create function to count user communities
CREATE OR REPLACE FUNCTION get_user_community_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM community_members
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL STABLE;

-- Create index on deleted_at for filtering
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create index on bio for search
CREATE INDEX IF NOT EXISTS idx_users_bio ON users USING gin(to_tsvector('english', bio)) WHERE bio IS NOT NULL;

COMMENT ON COLUMN users.bio IS 'User biography, max 500 characters';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user account was soft-deleted and anonymized';
COMMENT ON COLUMN users.display_preferences IS 'JSON object controlling profile visibility settings';

