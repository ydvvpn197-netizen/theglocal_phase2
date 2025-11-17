-- ============================================
-- STANDARDIZE EVENTS SCHEMA
-- ============================================
-- This migration ensures all required columns exist
-- and adds indexes for optimal performance

-- Verify and add missing columns (if they don't exist from previous migrations)
-- These should already exist from migration 0049, but we're being defensive

-- Check if columns exist and add them if missing
DO $$ 
BEGIN
    -- Add image_url if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='image_url') THEN
        ALTER TABLE events ADD COLUMN image_url TEXT;
    END IF;

    -- Add venue if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='venue') THEN
        ALTER TABLE events ADD COLUMN venue TEXT;
    END IF;

    -- Add source_platform if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='source_platform') THEN
        ALTER TABLE events ADD COLUMN source_platform TEXT;
    END IF;

    -- Add external_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='external_id') THEN
        ALTER TABLE events ADD COLUMN external_id TEXT;
    END IF;

    -- Add expires_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='expires_at') THEN
        ALTER TABLE events ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;

    -- Add ai_enhanced if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='ai_enhanced') THEN
        ALTER TABLE events ADD COLUMN ai_enhanced BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add raw_data if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='raw_data') THEN
        ALTER TABLE events ADD COLUMN raw_data JSONB;
    END IF;
END $$;

-- Ensure external_booking_url exists (should be from 0001.sql)
-- This is the correct column name we'll use consistently
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='external_booking_url') THEN
        ALTER TABLE events ADD COLUMN external_booking_url TEXT;
    END IF;
END $$;

-- Update source_platform from source for existing events if null
UPDATE events 
SET source_platform = source 
WHERE source_platform IS NULL AND source IS NOT NULL;

-- Update venue from location_address for existing events if venue is null
UPDATE events 
SET venue = location_address 
WHERE venue IS NULL AND location_address IS NOT NULL;

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_source_platform ON events(source_platform);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_location_city ON events(location_city);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_ai_enhanced ON events(ai_enhanced);

-- Create unique index on external_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_external_id_unique 
ON events(external_id) WHERE external_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN events.external_booking_url IS 'URL for booking tickets (BookMyShow, Eventbrite, etc.)';
COMMENT ON COLUMN events.source_platform IS 'Platform source: bookmyshow, eventbrite, insider, allevents, artist, community';
COMMENT ON COLUMN events.external_id IS 'Unique identifier from external platform (used for deduplication)';
COMMENT ON COLUMN events.venue IS 'Venue name (may differ from location_address which is full address)';
COMMENT ON COLUMN events.expires_at IS 'When event should be removed from listings (default: 24h after event_date)';

