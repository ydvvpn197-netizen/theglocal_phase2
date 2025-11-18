-- Add external_id column to events table for tracking external scraped events
-- This helps prevent duplicate events from being inserted

-- Add external_id column (nullable to support existing events)
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Create index on external_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id);

-- Create unique constraint on (source, external_id) to prevent duplicate insertions
-- This allows the same external_id across different sources but not within the same source
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_external_id 
ON events(source, external_id) 
WHERE external_id IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN events.external_id IS 'Unique identifier from external source (e.g., bookmyshow-12345, eventbrite-67890). Used to prevent duplicate event insertions.';

