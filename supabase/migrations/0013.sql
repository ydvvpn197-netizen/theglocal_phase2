-- Profile RLS Policies Migration
-- Version: 0013
-- Description: Add RLS policies for profile access control
-- Date: 2025-10-11

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view non-deleted user profiles (public data only)
CREATE POLICY "Public profiles are viewable by everyone"
ON users
FOR SELECT
USING (deleted_at IS NULL);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Users can view their own full profile including deleted status
CREATE POLICY "Users can view own full profile"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Ensure bookings are only visible to the booking creator and the artist
CREATE POLICY "Bookings visible to user and artist"
ON bookings
FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() = artist_id
);

-- Ensure reports are only visible to the reporter and admins
-- Note: Admin check would require a separate function or join
CREATE POLICY "Reports visible to reporter"
ON reports
FOR SELECT
USING (auth.uid() = reported_by);

-- Add comment explaining profile privacy
COMMENT ON POLICY "Public profiles are viewable by everyone" ON users IS 
'Allow public viewing of user profiles. Deleted users are excluded from public view.';

COMMENT ON POLICY "Users can update own profile" ON users IS 
'Users can only update their own profile information.';

COMMENT ON POLICY "Users can view own full profile" ON users IS 
'Users can view their full profile including private data and deleted status.';

