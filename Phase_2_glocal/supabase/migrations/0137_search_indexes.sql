-- ============================================
-- SEARCH INDEXES
-- Version: 0137
-- Description: Add indexes for enhanced search functionality with full-text search and fuzzy matching
-- Date: 2025-01-27
-- ============================================

-- Enable pg_trgm extension for fuzzy matching (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ARTISTS SEARCH INDEXES
-- ============================================

-- Full-text search index on stage_name
CREATE INDEX IF NOT EXISTS idx_artists_stage_name_gin 
ON artists USING gin(to_tsvector('english', stage_name));

-- Full-text search index on description
CREATE INDEX IF NOT EXISTS idx_artists_description_gin 
ON artists USING gin(to_tsvector('english', COALESCE(description, '')));

-- Trigram index for fuzzy matching on stage_name
CREATE INDEX IF NOT EXISTS idx_artists_stage_name_trgm 
ON artists USING gin(stage_name gin_trgm_ops);

-- Trigram index for fuzzy matching on description
CREATE INDEX IF NOT EXISTS idx_artists_description_trgm 
ON artists USING gin(COALESCE(description, '') gin_trgm_ops);

-- Trigram index for fuzzy matching on service_category
CREATE INDEX IF NOT EXISTS idx_artists_service_category_trgm 
ON artists USING gin(service_category gin_trgm_ops);

-- ============================================
-- EVENTS SEARCH INDEXES
-- ============================================

-- Full-text search index on title
CREATE INDEX IF NOT EXISTS idx_events_title_gin 
ON events USING gin(to_tsvector('english', title));

-- Full-text search index on description
CREATE INDEX IF NOT EXISTS idx_events_description_gin 
ON events USING gin(to_tsvector('english', COALESCE(description, '')));

-- Trigram index for fuzzy matching on title
CREATE INDEX IF NOT EXISTS idx_events_title_trgm 
ON events USING gin(title gin_trgm_ops);

-- Trigram index for fuzzy matching on description
CREATE INDEX IF NOT EXISTS idx_events_description_trgm 
ON events USING gin(COALESCE(description, '') gin_trgm_ops);

-- ============================================
-- COMMUNITIES SEARCH INDEXES
-- ============================================

-- Full-text search index on name
CREATE INDEX IF NOT EXISTS idx_communities_name_gin 
ON communities USING gin(to_tsvector('english', name));

-- Full-text search index on description
CREATE INDEX IF NOT EXISTS idx_communities_description_gin 
ON communities USING gin(to_tsvector('english', COALESCE(description, '')));

-- Trigram index for fuzzy matching on name
CREATE INDEX IF NOT EXISTS idx_communities_name_trgm 
ON communities USING gin(name gin_trgm_ops);

-- Trigram index for fuzzy matching on description
CREATE INDEX IF NOT EXISTS idx_communities_description_trgm 
ON communities USING gin(COALESCE(description, '') gin_trgm_ops);

-- ============================================
-- POSTS SEARCH INDEXES
-- ============================================

-- Full-text search index on title
CREATE INDEX IF NOT EXISTS idx_posts_title_gin 
ON posts USING gin(to_tsvector('english', title));

-- Full-text search index on body
CREATE INDEX IF NOT EXISTS idx_posts_body_gin 
ON posts USING gin(to_tsvector('english', COALESCE(body, '')));

-- Trigram index for fuzzy matching on title
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm 
ON posts USING gin(title gin_trgm_ops);

-- Trigram index for fuzzy matching on body
CREATE INDEX IF NOT EXISTS idx_posts_body_trgm 
ON posts USING gin(COALESCE(body, '') gin_trgm_ops);

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Artists: subscription_status + location_city for active artists in a city
CREATE INDEX IF NOT EXISTS idx_artists_status_city 
ON artists(subscription_status, location_city) 
WHERE subscription_status IN ('active', 'trial');

-- Events: event_date + location_city for events in a city
-- Note: Cannot use NOW() in index predicate (not IMMUTABLE), filter in application code
CREATE INDEX IF NOT EXISTS idx_events_date_city 
ON events(event_date, location_city);

-- Posts: created_at + location_city for recent posts in a city
CREATE INDEX IF NOT EXISTS idx_posts_created_city 
ON posts(created_at DESC, location_city) 
WHERE is_deleted = false;

-- Communities: member_count + location_city for popular communities in a city
CREATE INDEX IF NOT EXISTS idx_communities_members_city 
ON communities(member_count DESC, location_city) 
WHERE is_deleted = false;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created search indexes for artists, events, communities, and posts';
  RAISE NOTICE '✅ Enabled pg_trgm extension for fuzzy matching';
  RAISE NOTICE '✅ Created full-text search (GIN) indexes';
  RAISE NOTICE '✅ Created trigram (fuzzy matching) indexes';
  RAISE NOTICE '✅ Created composite indexes for common search queries';
END $$;

