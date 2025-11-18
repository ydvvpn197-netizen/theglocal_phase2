-- ============================================
-- FIX RLS POLICIES FOR EVENT AGGREGATOR
-- ============================================
-- 
-- The event sync service needs to insert/update events from external platforms
-- This requires a policy that allows service_role to insert events without artist_id
--
-- Events from external sources will have:
-- - artist_id = NULL
-- - source_platform = 'eventbrite', 'bookmyshow', 'insider', 'allevents'
-- - external_id populated
--

-- Allow service role to insert external events
CREATE POLICY "Service role can insert external events"
  ON events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to update external events
CREATE POLICY "Service role can update external events"
  ON events FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow system to insert events from external platforms (for cron jobs)
-- This policy allows inserts where artist_id is NULL and source_platform is set
CREATE POLICY "System can insert external events"
  ON events FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    artist_id IS NULL AND
    source_platform IS NOT NULL AND
    external_id IS NOT NULL
  );

-- Allow system to update external events
CREATE POLICY "System can update external events"
  ON events FOR UPDATE
  TO authenticated, anon
  USING (
    artist_id IS NULL AND
    source_platform IS NOT NULL AND
    external_id IS NOT NULL
  )
  WITH CHECK (
    artist_id IS NULL AND
    source_platform IS NOT NULL AND
    external_id IS NOT NULL
  );

-- Grant necessary permissions
GRANT INSERT, UPDATE ON events TO service_role;

-- Add comment for documentation
COMMENT ON POLICY "Service role can insert external events" ON events IS 
  'Allows event aggregator sync service to insert events from external platforms';

COMMENT ON POLICY "System can insert external events" ON events IS 
  'Allows authenticated requests to insert external events without artist_id';

