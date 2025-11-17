-- Migration: Add performance indexes for poll system
-- Version: 0126
-- Description: Add indexes to optimize poll queries, vote lookups, and feed loading

SET search_path TO public;

-- ============================================
-- PART 1: POLL_VOTES INDEXES
-- ============================================

-- Index for faster vote lookups by poll_id and vote_hash
-- Used when checking if a user has already voted
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_hash 
ON poll_votes(poll_id, vote_hash);

COMMENT ON INDEX idx_poll_votes_poll_hash IS 'Optimizes vote lookup queries by poll_id and vote_hash';

-- Index for faster vote queries by poll_id
-- Used when fetching all votes for a poll
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id 
ON poll_votes(poll_id);

COMMENT ON INDEX idx_poll_votes_poll_id IS 'Optimizes queries that fetch all votes for a poll';

-- ============================================
-- PART 2: POLLS INDEXES
-- ============================================

-- Composite index for feed queries filtered by community and sorted by creation date
-- Used in GET /api/polls?community_id=xxx
CREATE INDEX IF NOT EXISTS idx_polls_community_created 
ON polls(community_id, created_at DESC);

COMMENT ON INDEX idx_polls_community_created IS 'Optimizes poll feed queries filtered by community and sorted by creation date';

-- Index for expired poll filtering
-- Used when filtering out expired polls
CREATE INDEX IF NOT EXISTS idx_polls_expires_at 
ON polls(expires_at) 
WHERE expires_at IS NOT NULL;

COMMENT ON INDEX idx_polls_expires_at IS 'Optimizes queries that filter polls by expiration date';

-- Index for category filtering
-- Used when filtering polls by category
CREATE INDEX IF NOT EXISTS idx_polls_category 
ON polls(category);

COMMENT ON INDEX idx_polls_category IS 'Optimizes queries that filter polls by category';

-- Index for location-based queries
-- Used when filtering polls by city
CREATE INDEX IF NOT EXISTS idx_polls_location_city 
ON polls(location_city);

COMMENT ON INDEX idx_polls_location_city IS 'Optimizes queries that filter polls by location city';

-- ============================================
-- PART 3: POLL_OPTIONS INDEXES
-- ============================================

-- Composite index for option sorting by poll and display order
-- Used when fetching options in correct order
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_order 
ON poll_options(poll_id, display_order);

COMMENT ON INDEX idx_poll_options_poll_order IS 'Optimizes queries that fetch poll options sorted by display_order';

-- Index for option queries by poll_id
-- Used when fetching all options for a poll
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id 
ON poll_options(poll_id);

COMMENT ON INDEX idx_poll_options_poll_id IS 'Optimizes queries that fetch all options for a poll';

-- ============================================
-- PART 4: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Poll performance indexes created!';
  RAISE NOTICE '✅ Indexes added for poll_votes, polls, and poll_options tables';
  RAISE NOTICE '✅ Optimized queries for feed loading, vote lookups, and filtering';
  RAISE NOTICE '📝 Migration 0126 complete';
END $$;

