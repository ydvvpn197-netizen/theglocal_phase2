-- Geocoding Triggers
-- Version: 0105
-- Description: Database triggers to automatically queue geocoding requests on INSERT/UPDATE
-- Date: 2025-01-27

SET search_path TO public;

-- ============================================
-- HELPER FUNCTION TO QUEUE GEOCODING
-- ============================================
-- Note: We queue geocoding requests instead of calling HTTP directly
-- The batch cron job will process the queue

CREATE OR REPLACE FUNCTION trigger_geocoding()
RETURNS TRIGGER AS $$
DECLARE
  city_value TEXT;
BEGIN
  -- Extract city value from appropriate column
  city_value := NEW.location_city;
  
  -- Only proceed if we have a city but no coordinates
  IF city_value IS NOT NULL AND city_value != '' AND NEW.location_coordinates IS NULL THEN
    -- Insert into geocoding queue
    BEGIN
      INSERT INTO geocoding_queue (table_name, record_id, city, status)
      VALUES (TG_TABLE_NAME, NEW.id, city_value, 'pending')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- If geocoding_queue doesn't exist yet, silently skip
      RAISE WARNING 'geocoding_queue not available: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS FOR ALL LOCATION TABLES
-- ============================================

-- Events table
DROP TRIGGER IF EXISTS trigger_geocoding_events ON events;
CREATE TRIGGER trigger_geocoding_events
  AFTER INSERT OR UPDATE OF location_city, location_coordinates ON events
  FOR EACH ROW
  WHEN (NEW.location_city IS NOT NULL AND NEW.location_coordinates IS NULL)
  EXECUTE FUNCTION trigger_geocoding();

-- Users table
DROP TRIGGER IF EXISTS trigger_geocoding_users ON users;
CREATE TRIGGER trigger_geocoding_users
  AFTER INSERT OR UPDATE OF location_city, location_coordinates ON users
  FOR EACH ROW
  WHEN (NEW.location_city IS NOT NULL AND NEW.location_coordinates IS NULL)
  EXECUTE FUNCTION trigger_geocoding();

-- Communities table
DROP TRIGGER IF EXISTS trigger_geocoding_communities ON communities;
CREATE TRIGGER trigger_geocoding_communities
  AFTER INSERT OR UPDATE OF location_city, location_coordinates ON communities
  FOR EACH ROW
  WHEN (NEW.location_city IS NOT NULL AND NEW.location_coordinates IS NULL)
  EXECUTE FUNCTION trigger_geocoding();

-- Posts table
DROP TRIGGER IF EXISTS trigger_geocoding_posts ON posts;
CREATE TRIGGER trigger_geocoding_posts
  AFTER INSERT OR UPDATE OF location_city, location_coordinates ON posts
  FOR EACH ROW
  WHEN (NEW.location_city IS NOT NULL AND NEW.location_coordinates IS NULL)
  EXECUTE FUNCTION trigger_geocoding();

-- Artists table
DROP TRIGGER IF EXISTS trigger_geocoding_artists ON artists;
CREATE TRIGGER trigger_geocoding_artists
  AFTER INSERT OR UPDATE OF location_city, location_coordinates ON artists
  FOR EACH ROW
  WHEN (NEW.location_city IS NOT NULL AND NEW.location_coordinates IS NULL)
  EXECUTE FUNCTION trigger_geocoding();

-- Polls table
DROP TRIGGER IF EXISTS trigger_geocoding_polls ON polls;
CREATE TRIGGER trigger_geocoding_polls
  AFTER INSERT OR UPDATE OF location_city, location_coordinates ON polls
  FOR EACH ROW
  WHEN (NEW.location_city IS NOT NULL AND NEW.location_coordinates IS NULL)
  EXECUTE FUNCTION trigger_geocoding();

-- Add comments
COMMENT ON FUNCTION trigger_geocoding() IS 'Automatically queue geocoding request when location_city is set but location_coordinates is NULL';

DO $$
BEGIN
  RAISE NOTICE '✅ Created geocoding triggers for all 6 location tables';
  RAISE NOTICE '📝 Migration 0105 complete - auto-geocoding triggers enabled';
  RAISE NOTICE '📋 Triggers automatically queue geocoding requests for processing by cron job';
END$$;

