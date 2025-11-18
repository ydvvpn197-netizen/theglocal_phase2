-- Performance Indexes
-- Version: 0075
-- Description: Add comprehensive performance indexes and materialized views
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_community_created_at ON posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at ON posts(author_id, created_at DESC);
-- Status does not exist on posts; use is_deleted filter for active posts
CREATE INDEX IF NOT EXISTS idx_posts_active_created_at ON posts(created_at DESC) WHERE is_deleted = false;
-- Use geography index for location_coordinates
CREATE INDEX IF NOT EXISTS idx_posts_location_coordinates ON posts USING GIST(location_coordinates) WHERE location_coordinates IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON posts(updated_at DESC) WHERE is_deleted = true;

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_created_at ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_created_at ON comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_flag ON comments(created_at DESC) WHERE is_deleted = true;

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_join_date ON users(join_date DESC);
-- last_login_at does not exist
-- subscription_status does not exist on users

-- Artists indexes
CREATE INDEX IF NOT EXISTS idx_artists_status_created_at ON artists(subscription_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artists_location_coordinates ON artists USING GIST(location_coordinates) WHERE location_coordinates IS NOT NULL;
-- Grace period column does not exist; index meaningful subscription fields instead
CREATE INDEX IF NOT EXISTS idx_artists_subscription_dates ON artists(subscription_start_date, subscription_end_date);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_date_city ON events(event_date, location_city);
CREATE INDEX IF NOT EXISTS idx_events_artist_created_at ON events(artist_id, created_at DESC);
-- status does not exist on events

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_content_created_at ON reports(content_type, content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported_by_created_at ON reports(reported_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON reports(status, created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created_at ON notifications(type, created_at DESC);
-- Use read_at IS NULL to identify unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_created_at ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created_at ON payment_transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_artist_created_at ON payment_transactions(artist_id, created_at DESC);

-- Webhook logs indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_method_created_at ON webhook_logs(payment_method, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created_at ON webhook_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry_failed ON webhook_logs(next_retry_at) WHERE status = 'failed';

-- Mass reporting indexes
CREATE INDEX IF NOT EXISTS idx_mass_reporting_content_created_at ON mass_reporting_events(content_type, content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mass_reporting_status_created_at ON mass_reporting_events(status, created_at DESC);

-- Appeals indexes
CREATE INDEX IF NOT EXISTS idx_appeals_appellant_created_at ON appeals(appellant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appeals_status_created_at ON appeals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appeals_reviewer ON appeals(assigned_reviewer) WHERE assigned_reviewer IS NOT NULL;

-- Content recovery indexes
CREATE INDEX IF NOT EXISTS idx_content_recovery_requester_created_at ON content_recovery_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_recovery_status_created_at ON content_recovery_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_recovery_expires_pending ON content_recovery_requests(expires_at) WHERE status = 'pending';

-- API usage indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_service_created_at ON api_usage_logs(service_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created_at ON api_usage_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_cost ON api_usage_logs(cost_usd DESC);

-- Helpful indexes for views below
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_votes_content ON votes(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- ============================================
-- MATERIALIZED VIEWS FOR EXPENSIVE AGGREGATIONS
-- ============================================

-- Popular posts materialized view
-- Replace likes with upvotes from votes, and filter out deleted posts
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_posts AS
WITH agg AS (
  SELECT
    p.id,
    p.title,
    p.author_id,
    p.community_id,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT c.id) AS comment_count,
    SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END) AS like_count,
    SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END) AS downvote_count,
    COALESCE((
      SELECT COUNT(1) FROM reports r
      WHERE r.content_type = 'post' AND r.content_id = p.id
    ), 0) AS report_count
  FROM posts p
  LEFT JOIN comments c ON p.id = c.post_id AND c.is_deleted = false
  LEFT JOIN votes v ON v.content_type = 'post' AND v.content_id = p.id
  WHERE p.is_deleted = false
    AND p.created_at > NOW() - INTERVAL '30 days'
  GROUP BY p.id, p.title, p.author_id, p.community_id, p.created_at, p.updated_at
)
SELECT
  id,
  title,
  author_id,
  community_id,
  created_at,
  updated_at,
  comment_count,
  like_count,
  report_count,
  (comment_count * 2 + like_count * 3 - report_count * 5) AS popularity_score
FROM agg
WHERE report_count < 5
ORDER BY popularity_score DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_popular_posts_score ON popular_posts(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_popular_posts_community ON popular_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_popular_posts_created_at ON popular_posts(created_at DESC);

-- Active users materialized view
-- Use join_date as baseline and activity from posts/comments/votes
CREATE MATERIALIZED VIEW IF NOT EXISTS active_users AS
SELECT
  u.id,
  u.anonymous_handle,
  u.join_date AS created_at,
  NULL::timestamptz AS last_login_at,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false) AS post_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.is_deleted = false) AS comment_count,
  COUNT(DISTINCT v.id) AS like_count,
  (COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false) * 5
   + COUNT(DISTINCT c.id) FILTER (WHERE c.is_deleted = false) * 2
   + COUNT(DISTINCT v.id)) AS activity_score
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
LEFT JOIN comments c ON u.id = c.author_id
LEFT JOIN votes v ON u.id = v.user_id
WHERE u.join_date > NOW() - INTERVAL '90 days'
GROUP BY u.id, u.anonymous_handle, u.join_date
HAVING (COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id) + COUNT(DISTINCT v.id)) > 0
ORDER BY activity_score DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_active_users_score ON active_users(activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_active_users_created_at ON active_users(created_at DESC);

-- Community statistics materialized view
-- Derive member_count from community_members, artist_count via artists linked to users that are members (approximation)
CREATE MATERIALIZED VIEW IF NOT EXISTS community_stats AS
WITH post_pop AS (
  SELECT pp.id, pp.popularity_score FROM popular_posts pp
)
SELECT
  c.id,
  c.name,
  c.created_at,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false) AS post_count,
  COUNT(DISTINCT cm.user_id) AS member_count,
  COUNT(DISTINCT a.id) AS artist_count,
  AVG(pp.popularity_score)::numeric AS avg_post_popularity
FROM communities c
LEFT JOIN posts p ON c.id = p.community_id
LEFT JOIN community_members cm ON c.id = cm.community_id
LEFT JOIN users u ON u.id = cm.user_id
LEFT JOIN artists a ON a.id = u.id  -- artist.id references users.id
LEFT JOIN post_pop pp ON p.id = pp.id
GROUP BY c.id, c.name, c.created_at
ORDER BY post_count DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_community_stats_posts ON community_stats(post_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_stats_members ON community_stats(member_count DESC);

-- Artist performance materialized view
-- Use artists.stage_name and events have no status; include all events
CREATE MATERIALIZED VIEW IF NOT EXISTS artist_performance AS
SELECT
  a.id,
  a.stage_name AS name,
  a.id AS user_id,
  a.subscription_status,
  a.created_at,
  COUNT(DISTINCT e.id) AS event_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false) AS post_count,
  COUNT(DISTINCT cm.user_id) AS follower_count, -- proxy if you have followers table: replace cm with followers if present
  AVG(NULLIF(e.rsvp_count,0))::numeric AS avg_attendance,
  (COUNT(DISTINCT e.id) * 3
   + COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false) * 2
   + COUNT(DISTINCT cm.user_id)) AS performance_score
FROM artists a
LEFT JOIN events e ON a.id = e.artist_id
LEFT JOIN posts p ON a.id = p.author_id
LEFT JOIN community_members cm ON cm.user_id = a.id  -- placeholder for followers; adjust if you have followers table
GROUP BY a.id, a.stage_name, a.subscription_status, a.created_at
ORDER BY performance_score DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_artist_performance_score ON artist_performance(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_artist_performance_status ON artist_performance(subscription_status);

-- ============================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_posts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY community_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY artist_performance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT)
RETURNS VOID AS $$
BEGIN
  CASE view_name
    WHEN 'popular_posts' THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY popular_posts;
    WHEN 'active_users' THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY active_users;
    WHEN 'community_stats' THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY community_stats;
    WHEN 'artist_performance' THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY artist_performance;
    ELSE
      RAISE EXCEPTION 'Unknown materialized view: %', view_name;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_trending_posts(
  p_community_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  author_id UUID,
  community_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  comment_count BIGINT,
  like_count BIGINT,
  popularity_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id, pp.title, pp.author_id, pp.community_id, pp.created_at,
    pp.comment_count, pp.like_count, pp.popularity_score
  FROM popular_posts pp
  WHERE (p_community_id IS NULL OR pp.community_id = p_community_id)
  ORDER BY pp.popularity_score DESC, pp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_active_users(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  anonymous_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  post_count BIGINT,
  comment_count BIGINT,
  like_count BIGINT,
  activity_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id, au.anonymous_handle, au.created_at, au.last_login_at,
    au.post_count, au.comment_count, au.like_count, au.activity_score
  FROM active_users au
  ORDER BY au.activity_score DESC, au.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_community_statistics(
  p_community_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  post_count BIGINT,
  member_count BIGINT,
  artist_count BIGINT,
  avg_post_popularity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id, cs.name, cs.created_at, cs.post_count, cs.member_count, cs.artist_count, cs.avg_post_popularity
  FROM community_stats cs
  WHERE (p_community_id IS NULL OR cs.id = p_community_id)
  ORDER BY cs.post_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_artist_performance(
  p_artist_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  user_id UUID,
  subscription_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  event_count BIGINT,
  post_count BIGINT,
  follower_count BIGINT,
  avg_attendance NUMERIC,
  performance_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.id, ap.name, ap.user_id, ap.subscription_status, ap.created_at,
    ap.event_count, ap.post_count, ap.follower_count, ap.avg_attendance, ap.performance_score
  FROM artist_performance ap
  WHERE (p_artist_id IS NULL OR ap.id = p_artist_id)
  ORDER BY ap.performance_score DESC, ap.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SLOW QUERY LOGGING
-- ============================================

CREATE OR REPLACE FUNCTION log_slow_query(
  p_query TEXT,
  p_duration_ms INTEGER,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO slow_query_logs (query, duration_ms, user_id, executed_at)
  VALUES (p_query, p_duration_ms, p_user_id, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS slow_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_logs_duration ON slow_query_logs(duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_logs_executed_at ON slow_query_logs(executed_at DESC);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON MATERIALIZED VIEW popular_posts IS 'Cached view of popular posts with engagement metrics (uses votes for likes)';
COMMENT ON MATERIALIZED VIEW active_users IS 'Cached view of active users with activity scores';
COMMENT ON MATERIALIZED VIEW community_stats IS 'Cached view of community statistics';
COMMENT ON MATERIALIZED VIEW artist_performance IS 'Cached view of artist performance metrics (proxy follower_count via community_members)';
COMMENT ON FUNCTION refresh_all_materialized_views() IS 'Refreshes all materialized views concurrently';
COMMENT ON FUNCTION get_trending_posts(UUID, INTEGER, INTEGER) IS 'Gets trending posts using materialized view';
COMMENT ON FUNCTION get_active_users(INTEGER, INTEGER) IS 'Gets active users using materialized view';
COMMENT ON FUNCTION get_community_statistics(UUID) IS 'Gets community statistics using materialized view';
COMMENT ON FUNCTION get_artist_performance(UUID, INTEGER, INTEGER) IS 'Gets artist performance using materialized view';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created comprehensive performance indexes';
  RAISE NOTICE '✅ Added materialized views for expensive aggregations';
  RAISE NOTICE '✅ Implemented query optimization functions';
  RAISE NOTICE '✅ Added slow query logging';
  RAISE NOTICE '📝 Migration 0075 complete - performance optimization enhanced';
END$$;