-- Artist Distance Function Migration
-- Version: 0040
-- Description: Add distance calculation function for artist distance display
-- Date: 2025-01-27

-- Function to calculate distance between two GEOGRAPHY points in kilometers
CREATE OR REPLACE FUNCTION calculate_distance_km(point1 GEOGRAPHY, point2 GEOGRAPHY)
RETURNS DECIMAL AS $$
BEGIN
  -- Return distance in kilometers using PostGIS ST_Distance
  -- ST_Distance returns distance in meters, so divide by 1000 for km
  RETURN ROUND((ST_Distance(point1, point2) / 1000)::DECIMAL, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get artists with distance from user location
CREATE OR REPLACE FUNCTION get_artists_with_distance(
  user_coordinates GEOGRAPHY,
  city_filter TEXT DEFAULT NULL,
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
  created_at TIMESTAMPTZ,
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
    a.created_at,
    calculate_distance_km(user_coordinates, a.location_coordinates) as distance_km
  FROM artists a
  WHERE 
    a.location_coordinates IS NOT NULL
    AND (city_filter IS NULL OR a.location_city ILIKE '%' || city_filter || '%')
    AND (category_filter IS NULL OR a.service_category = category_filter)
    AND a.subscription_status IN ('active', 'trial')
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add index for better performance on distance calculations
CREATE INDEX IF NOT EXISTS idx_artists_location_coordinates_not_null 
ON artists USING GIST(location_coordinates) 
WHERE location_coordinates IS NOT NULL;

COMMENT ON FUNCTION calculate_distance_km IS 'Calculate distance between two GEOGRAPHY points in kilometers';
COMMENT ON FUNCTION get_artists_with_distance IS 'Get artists with distance calculation from user coordinates';
