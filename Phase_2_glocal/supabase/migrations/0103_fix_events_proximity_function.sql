-- Fix get_events_within_radius function
-- Version: 0103
-- Description: Remove non-existent 'price' column reference from proximity function
-- Date: 2025-01-27

SET search_path TO public;

-- Fix: Remove price column from RETURNS TABLE and SELECT
-- Drop the function first since we're changing the return type
DROP FUNCTION IF EXISTS public.get_events_within_radius(double precision, double precision, double precision, text, text, integer);

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

COMMENT ON FUNCTION get_events_within_radius IS 'Get upcoming events within specified radius with distance calculation - FIXED: removed non-existent price column';

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed get_events_within_radius function';
  RAISE NOTICE '📝 Migration 0103 complete - events proximity search now functional';
END$$;

