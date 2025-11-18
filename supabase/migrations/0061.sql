-- Proximity Search Functions Migration
-- Version: 0061
-- Description: Add PostGIS proximity search functions for artists, events, communities, and posts
-- Date: 2025-10-21

-- ============================================
-- PROXIMITY SEARCH FUNCTIONS
-- ============================================

-- Function: Get artists within radius with distance calculation
CREATE OR REPLACE FUNCTION get_artists_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  stage_name TEXT,
  service_category TEXT,
  description TEXT,
  location_city TEXT,
  location_coordinates GEOGRAPHY,
  rate_min INTEGER,
  rate_max INTEGER,
  portfolio_images TEXT[],
  profile_views INTEGER,
  subscription_status TEXT,
  verification_status TEXT,
  rating_avg DECIMAL,
  rating_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.stage_name,
    a.service_category,
    a.description,
    a.location_city,
    a.location_coordinates,
    a.rate_min,
    a.rate_max,
    a.portfolio_images,
    a.profile_views,
    a.subscription_status,
    a.verification_status,
    a.rating_avg,
    a.rating_count,
    a.created_at,
    a.updated_at,
    ROUND((ST_Distance(
      a.location_coordinates,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::DECIMAL, 1) AS distance_km
  FROM artists a
  WHERE 
    a.location_coordinates IS NOT NULL
    AND ST_DWithin(
      a.location_coordinates,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000 -- meters
    )
    AND (category_filter IS NULL OR a.service_category = category_filter)
    AND a.subscription_status IN ('active', 'trial')
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get events within radius with distance calculation
CREATE OR REPLACE FUNCTION get_events_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  category_filter TEXT DEFAULT NULL,
  source_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  artist_id UUID,
  external_event_id TEXT,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location_city TEXT,
  location_address TEXT,
  location_coordinates GEOGRAPHY,
  venue TEXT,
  category TEXT,
  ticket_info TEXT,
  image_url TEXT,
  external_booking_url TEXT,
  source TEXT,
  source_platform TEXT,
  rsvp_count INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.artist_id,
    e.external_event_id,
    e.title,
    e.description,
    e.event_date,
    e.location_city,
    e.location_address,
    e.location_coordinates,
    e.venue,
    e.category,
    e.ticket_info,
    e.image_url,
    e.external_booking_url,
    e.source,
    e.source_platform,
    e.rsvp_count,
    e.expires_at,
    e.created_at,
    e.updated_at,
    ROUND((ST_Distance(
      e.location_coordinates,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::DECIMAL, 1) AS distance_km
  FROM events e
  WHERE 
    e.location_coordinates IS NOT NULL
    AND ST_DWithin(
      e.location_coordinates,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
    AND e.event_date >= NOW()
    AND e.expires_at > NOW()
    AND (category_filter IS NULL OR e.category = category_filter)
    AND (source_filter IS NULL OR e.source = source_filter OR e.source_platform = source_filter)
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get communities within radius with distance calculation
CREATE OR REPLACE FUNCTION get_communities_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  rules TEXT,
  location_city TEXT,
  location_coordinates GEOGRAPHY,
  created_by UUID,
  member_count INTEGER,
  post_count INTEGER,
  is_private BOOLEAN,
  is_featured BOOLEAN,
  is_deleted BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.description,
    c.rules,
    c.location_city,
    c.location_coordinates,
    c.created_by,
    c.member_count,
    c.post_count,
    c.is_private,
    c.is_featured,
    c.is_deleted,
    c.created_at,
    c.updated_at,
    ROUND((ST_Distance(
      c.location_coordinates,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::DECIMAL, 1) AS distance_km
  FROM communities c
  WHERE 
    c.location_coordinates IS NOT NULL
    AND ST_DWithin(
      c.location_coordinates,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
    AND c.is_deleted = FALSE
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get posts within radius (from nearby communities)
CREATE OR REPLACE FUNCTION get_posts_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  community_id UUID,
  author_id UUID,
  title TEXT,
  body TEXT,
  image_url TEXT,
  location_city TEXT,
  location_coordinates GEOGRAPHY,
  upvotes INTEGER,
  downvotes INTEGER,
  comment_count INTEGER,
  view_count INTEGER,
  is_deleted BOOLEAN,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.community_id,
    p.author_id,
    p.title,
    p.body,
    p.image_url,
    p.location_city,
    p.location_coordinates,
    p.upvotes,
    p.downvotes,
    p.comment_count,
    p.view_count,
    p.is_deleted,
    p.is_edited,
    p.created_at,
    p.updated_at,
    CASE 
      WHEN p.location_coordinates IS NOT NULL THEN
        ROUND((ST_Distance(
          p.location_coordinates,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000)::DECIMAL, 1)
      WHEN c.location_coordinates IS NOT NULL THEN
        ROUND((ST_Distance(
          c.location_coordinates,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000)::DECIMAL, 1)
      ELSE NULL
    END AS distance_km
  FROM posts p
  INNER JOIN communities c ON p.community_id = c.id
  WHERE 
    p.is_deleted = FALSE
    AND c.is_deleted = FALSE
    AND (
      (p.location_coordinates IS NOT NULL AND ST_DWithin(
        p.location_coordinates,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000
      ))
      OR
      (c.location_coordinates IS NOT NULL AND ST_DWithin(
        c.location_coordinates,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000
      ))
    )
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Spatial indexes to accelerate ST_DWithin/ST_Distance on GEOGRAPHY columns
CREATE INDEX IF NOT EXISTS idx_artists_location_geog
  ON artists
  USING GIST (location_coordinates);

CREATE INDEX IF NOT EXISTS idx_events_location_geog
  ON events
  USING GIST (location_coordinates);

CREATE INDEX IF NOT EXISTS idx_communities_location_geog
  ON communities
  USING GIST (location_coordinates);

CREATE INDEX IF NOT EXISTS idx_posts_location_geog
  ON posts
  USING GIST (location_coordinates);

-- Composite index for artists with active/trial subscriptions (no volatile predicate)
CREATE INDEX IF NOT EXISTS idx_artists_subscription_city
  ON artists (subscription_status, location_city)
  WHERE location_coordinates IS NOT NULL;

-- Index for events to support time-based filtering without using NOW() in the predicate
-- Keep it general; queries with e.event_date >= NOW() and expires_at > NOW() can still use these
CREATE INDEX IF NOT EXISTS idx_events_date_expires
  ON events (event_date, expires_at)
  WHERE location_coordinates IS NOT NULL;

-- Index for non-deleted communities with coordinates
CREATE INDEX IF NOT EXISTS idx_communities_active_city
  ON communities (is_deleted, location_city)
  WHERE location_coordinates IS NOT NULL;

-- Index for non-deleted posts with coordinates
CREATE INDEX IF NOT EXISTS idx_posts_active_created_at
  ON posts (is_deleted, created_at DESC)
  WHERE location_coordinates IS NOT NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_artists_within_radius IS 'Get artists within specified radius with distance calculation, ordered by proximity';
COMMENT ON FUNCTION get_events_within_radius IS 'Get upcoming events within specified radius with distance calculation';
COMMENT ON FUNCTION get_communities_within_radius IS 'Get communities within specified radius with distance calculation';
COMMENT ON FUNCTION get_posts_within_radius IS 'Get posts from nearby communities within specified radius';