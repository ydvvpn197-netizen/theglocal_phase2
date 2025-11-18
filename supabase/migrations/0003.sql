-- Migration: Feed optimization indexes
-- Optimizes feed query performance with composite indexes
-- Created: October 7, 2025

-- Index for feed queries sorting by created_at with deleted filter
CREATE INDEX IF NOT EXISTS idx_posts_feed_recent 
ON posts (created_at DESC, is_deleted) 
WHERE is_deleted = false;

-- Index for popular sorting (upvotes with deleted filter)
CREATE INDEX IF NOT EXISTS idx_posts_feed_popular 
ON posts (upvotes DESC, created_at DESC, is_deleted) 
WHERE is_deleted = false;

-- Index for community-based feed queries
CREATE INDEX IF NOT EXISTS idx_posts_community_feed 
ON posts (community_id, created_at DESC, is_deleted) 
WHERE is_deleted = false;

-- Index for location-based feed queries
CREATE INDEX IF NOT EXISTS idx_posts_location_feed 
ON posts (location_city, created_at DESC, is_deleted) 
WHERE is_deleted = false;

-- Composite index for location + community filtering
CREATE INDEX IF NOT EXISTS idx_posts_location_community 
ON posts (location_city, community_id, created_at DESC);

-- Index for community members lookup (joining communities)
CREATE INDEX IF NOT EXISTS idx_community_members_user_lookup 
ON community_members (user_id, community_id);

-- Index for vote counting queries
CREATE INDEX IF NOT EXISTS idx_votes_content_lookup 
ON votes (content_type, content_id, vote_type);

-- Index for user vote lookup (checking existing votes)
CREATE INDEX IF NOT EXISTS idx_votes_user_content 
ON votes (user_id, content_type, content_id);

-- Add comments to explain optimization strategy
COMMENT ON INDEX idx_posts_feed_recent IS 'Optimizes recent posts feed query with deleted filter';
COMMENT ON INDEX idx_posts_feed_popular IS 'Optimizes popular posts feed query sorting by upvotes';
COMMENT ON INDEX idx_posts_community_feed IS 'Optimizes community-specific feed queries';
COMMENT ON INDEX idx_posts_location_feed IS 'Optimizes location-based feed filtering';
COMMENT ON INDEX idx_posts_location_community IS 'Composite index for multi-filter queries';
COMMENT ON INDEX idx_community_members_user_lookup IS 'Fast lookup for user community memberships';
COMMENT ON INDEX idx_votes_content_lookup IS 'Optimizes vote counting aggregation queries';
COMMENT ON INDEX idx_votes_user_content IS 'Fast lookup for user vote existence check';

