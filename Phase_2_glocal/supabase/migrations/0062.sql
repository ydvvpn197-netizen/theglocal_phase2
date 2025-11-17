-- User Saved Locations Table Migration
-- Version: 0062
-- Description: Add table for users to save multiple favorite locations
-- Date: 2025-10-21

-- ============================================
-- USER SAVED LOCATIONS TABLE
-- ============================================

CREATE TABLE user_saved_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_coordinates GEOGRAPHY(POINT) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Index for querying user's saved locations
CREATE INDEX idx_user_saved_locations_user_id 
ON user_saved_locations(user_id);

-- Index for finding primary location quickly
CREATE INDEX idx_user_saved_locations_primary 
ON user_saved_locations(user_id, is_primary) 
WHERE is_primary = TRUE;

-- Spatial index for location coordinates
CREATE INDEX idx_user_saved_locations_coordinates 
ON user_saved_locations USING GIST(location_coordinates);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_saved_locations_updated_at 
BEFORE UPDATE ON user_saved_locations
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one primary location per user
CREATE OR REPLACE FUNCTION ensure_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this location as primary, unset all other primary locations for this user
  IF NEW.is_primary = TRUE THEN
    UPDATE user_saved_locations
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_primary = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_trigger
BEFORE INSERT OR UPDATE ON user_saved_locations
FOR EACH ROW
WHEN (NEW.is_primary = TRUE)
EXECUTE FUNCTION ensure_single_primary_location();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_saved_locations IS 'Stores multiple saved locations per user for quick switching between areas of interest';
COMMENT ON COLUMN user_saved_locations.is_primary IS 'Indicates the user''s primary/default location. Only one can be primary per user.';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on the table
ALTER TABLE user_saved_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved locations
CREATE POLICY "Users can view their own saved locations"
ON user_saved_locations
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own saved locations
CREATE POLICY "Users can insert their own saved locations"
ON user_saved_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own saved locations
CREATE POLICY "Users can update their own saved locations"
ON user_saved_locations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own saved locations
CREATE POLICY "Users can delete their own saved locations"
ON user_saved_locations
FOR DELETE
USING (auth.uid() = user_id);

