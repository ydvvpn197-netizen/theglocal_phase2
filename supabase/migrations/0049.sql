-- ============================================
-- ENHANCE EVENTS TABLE FOR AI AGGREGATOR
-- ============================================

-- Add new columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_platform TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS ai_enhanced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS raw_data JSONB,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS venue TEXT;

-- Update existing source column to source_platform for clarity
-- Keep both for backward compatibility during transition
UPDATE events SET source_platform = source WHERE source_platform IS NULL;

-- Create unique index on external_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id) WHERE external_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_source_platform ON events(source_platform);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_location_city ON events(location_city);

-- Set expires_at for existing events (24 hours after event_date)
UPDATE events 
SET expires_at = event_date + INTERVAL '24 hours' 
WHERE expires_at IS NULL;

-- ============================================
-- AUTO-CLEANUP FUNCTION
-- ============================================

-- Function to delete expired events
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete events where expires_at has passed
  DELETE FROM events
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER FOR AUTO-SETTING EXPIRES_AT
-- ============================================

-- Function to automatically set expires_at on insert/update
CREATE OR REPLACE FUNCTION set_event_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expires_at to 24 hours after event_date if not manually set
  IF NEW.expires_at IS NULL AND NEW.event_date IS NOT NULL THEN
    NEW.expires_at := NEW.event_date + INTERVAL '24 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_event_expires_at ON events;
CREATE TRIGGER trigger_set_event_expires_at
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_event_expires_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission on cleanup function to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_events() TO service_role;

-- Update RLS policies if needed (assuming existing policies are in place)
-- The existing RLS policies should work with the new columns

