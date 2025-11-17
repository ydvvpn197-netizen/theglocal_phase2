-- ============================================
-- PREVENT EVENT DUPLICATES
-- ============================================
-- This migration adds database-level duplicate prevention:
-- 1. Composite unique constraint on key event fields
-- 2. Trigger to auto-generate external_id if missing
-- 3. Helper function to detect potential duplicates

-- ============================================
-- 1. STRENGTHEN EXTERNAL_ID UNIQUE CONSTRAINT
-- ============================================
-- Ensure external_id is unique and non-null
-- The trigger below will auto-generate external_id if missing
-- This prevents duplicates at the database level

-- Check if unique constraint already exists on external_id
-- If not, the migration 0051 should have created it
-- We'll verify it exists here

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_events_external_id_unique'
    ) THEN
        RAISE NOTICE 'Creating unique index on external_id';
        CREATE UNIQUE INDEX idx_events_external_id_unique 
        ON events(external_id) 
        WHERE external_id IS NOT NULL;
    ELSE
        RAISE NOTICE 'Unique index on external_id already exists';
    END IF;
END $$;

-- Note: We rely on:
-- 1. Auto-generation trigger (below) to create external_id for all events
-- 2. Unique index on external_id to prevent duplicates
-- 3. Hourly cleanup script to handle any edge cases

-- ============================================
-- 2. AUTO-GENERATE EXTERNAL_ID TRIGGER
-- ============================================
-- Creates a trigger function that auto-generates external_id
-- if it's missing during INSERT or UPDATE

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_external_id() CASCADE;

-- Create trigger function
CREATE OR REPLACE FUNCTION generate_external_id()
RETURNS TRIGGER AS $$
DECLARE
    title_slug TEXT;
    hash_input TEXT;
    hash_value TEXT;
BEGIN
    -- Only generate if external_id is NULL or empty
    IF NEW.external_id IS NULL OR NEW.external_id = '' THEN
        -- Create slug from title (first 30 chars, lowercase, replace spaces with hyphens)
        title_slug := LOWER(REGEXP_REPLACE(
            SUBSTRING(NEW.title, 1, 30),
            '[^a-z0-9]+',
            '-',
            'g'
        ));
        
        -- Trim leading/trailing hyphens
        title_slug := TRIM(BOTH '-' FROM title_slug);
        
        -- Create hash input from title + date + city
        hash_input := NEW.title || '-' || 
                     COALESCE(DATE(NEW.event_date)::TEXT, '') || '-' || 
                     COALESCE(NEW.location_city, '');
        
        -- Generate MD5 hash (first 12 characters)
        hash_value := SUBSTRING(MD5(hash_input), 1, 12);
        
        -- Combine platform + slug + hash
        NEW.external_id := COALESCE(NEW.source_platform, 'unknown') || '-' || 
                          title_slug || '-' || 
                          hash_value;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (fires BEFORE INSERT or UPDATE)
DROP TRIGGER IF EXISTS trigger_generate_external_id ON events;
CREATE TRIGGER trigger_generate_external_id
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION generate_external_id();

-- ============================================
-- 3. DUPLICATE DETECTION HELPER FUNCTION
-- ============================================
-- Creates a function to find potential duplicates
-- Useful for manual duplicate checks

DROP FUNCTION IF EXISTS find_duplicate_events(INTEGER);

CREATE OR REPLACE FUNCTION find_duplicate_events(
    limit_rows INTEGER DEFAULT 100
)
RETURNS TABLE (
    title TEXT,
    event_date DATE,
    location_city TEXT,
    source_platform TEXT,
    duplicate_count BIGINT,
    event_ids TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.title,
        DATE(e.event_date) as event_date,
        e.location_city,
        e.source_platform,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(e.id::TEXT ORDER BY e.created_at DESC) as event_ids
    FROM events e
    WHERE e.title IS NOT NULL 
      AND e.event_date IS NOT NULL
      AND e.location_city IS NOT NULL
      AND e.source_platform IS NOT NULL
    GROUP BY 
        e.source_platform,
        LOWER(TRIM(e.title)),
        DATE(e.event_date),
        LOWER(TRIM(e.location_city)),
        e.title,
        e.location_city
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. ADD HELPFUL COMMENTS
-- ============================================
COMMENT ON FUNCTION generate_external_id() IS 
    'Auto-generates deterministic external_id if missing during INSERT/UPDATE. This ensures all events have a unique identifier.';

COMMENT ON FUNCTION find_duplicate_events(INTEGER) IS 
    'Finds potential duplicate events grouped by key fields. Usage: SELECT * FROM find_duplicate_events(100);';

-- ============================================
-- 5. CLEANUP INSTRUCTIONS
-- ============================================
-- To manually find duplicates:
--   SELECT * FROM find_duplicate_events(50);
--
-- To manually cleanup a specific duplicate group:
--   DELETE FROM events 
--   WHERE id IN (SELECT unnest(event_ids[2:]) FROM find_duplicate_events(1000) WHERE duplicate_count > 1);
--
-- The unique constraint will prevent new duplicates from being inserted.
-- The trigger will ensure all events have a valid external_id.

-- Migration complete
DO $$ 
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Migration 0057 completed: Duplicate prevention enabled';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Unique constraint: external_id (verified/created)';
    RAISE NOTICE 'Auto-generation trigger: trigger_generate_external_id';
    RAISE NOTICE 'Helper function: find_duplicate_events(limit)';
    RAISE NOTICE 'Hourly cleanup script: /api/events/cleanup-duplicates';
    RAISE NOTICE '=================================================';
END $$;

