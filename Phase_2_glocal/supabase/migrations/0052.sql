-- ============================================
-- FIX EVENT CITIES - UPDATE "WORLD" TO REAL CITIES
-- ============================================
-- This migration fixes test/mock data that has location_city = 'World'
-- by distributing events randomly across real Indian cities

-- Update all events with 'World' city to real Indian cities
UPDATE events 
SET location_city = (
  CASE (FLOOR(RANDOM() * 8)::INT)
    WHEN 0 THEN 'Mumbai'
    WHEN 1 THEN 'Delhi'
    WHEN 2 THEN 'Bengaluru'
    WHEN 3 THEN 'Pune'
    WHEN 4 THEN 'Hyderabad'
    WHEN 5 THEN 'Chennai'
    WHEN 6 THEN 'Kolkata'
    ELSE 'Ahmedabad'
  END
)
WHERE location_city = 'World' OR location_city IS NULL;

-- Also update any events with lowercase or other variations
UPDATE events 
SET location_city = CASE location_city
  WHEN 'mumbai' THEN 'Mumbai'
  WHEN 'delhi' THEN 'Delhi'
  WHEN 'ncr' THEN 'Delhi'
  WHEN 'bengaluru' THEN 'Bengaluru'
  WHEN 'bangalore' THEN 'Bengaluru'
  WHEN 'pune' THEN 'Pune'
  WHEN 'hyderabad' THEN 'Hyderabad'
  WHEN 'chennai' THEN 'Chennai'
  WHEN 'kolkata' THEN 'Kolkata'
  WHEN 'ahmedabad' THEN 'Ahmedabad'
  ELSE location_city
END
WHERE location_city IN ('mumbai', 'delhi', 'ncr', 'bengaluru', 'bangalore', 'pune', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad');

-- Verify the update
DO $$
DECLARE
  world_count INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO world_count FROM events WHERE location_city = 'World';
  SELECT COUNT(*) INTO updated_count FROM events WHERE location_city IN ('Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad');
  
  RAISE NOTICE 'Events with "World" remaining: %', world_count;
  RAISE NOTICE 'Events with proper cities: %', updated_count;
END $$;

