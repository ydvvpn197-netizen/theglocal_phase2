-- Migration: Database-backed Rate Limiting
-- Creates a table to store rate limit counters for persistent rate limiting
-- across server restarts and multiple instances

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL, -- User ID or IP address
  action TEXT NOT NULL, -- Action type (e.g., 'post-create', 'comment-create')
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique constraint on identifier + action
  UNIQUE(identifier, action)
);

-- Create index for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
  ON rate_limits(identifier, action, reset_at);

-- Create index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
  ON rate_limits(reset_at) WHERE reset_at < NOW();

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own rate limits (for debugging)
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (
    identifier = auth.uid()::TEXT OR 
    identifier LIKE 'ip:%' -- Allow IP-based rate limits (used for unauthenticated requests)
  );

-- Policy: Service role can manage all rate limits (used by API routes)
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to check and increment rate limit atomically
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ,
  total_hits INTEGER
) AS $$
DECLARE
  v_reset_at TIMESTAMPTZ;
  v_count INTEGER;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- Calculate reset time (current time + window)
  v_reset_at := NOW() + (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Try to insert or update rate limit record
  INSERT INTO rate_limits (identifier, action, count, reset_at)
  VALUES (p_identifier, p_action, 1, v_reset_at)
  ON CONFLICT (identifier, action) 
  DO UPDATE SET
    -- If reset_at has passed, reset the counter
    count = CASE 
      WHEN rate_limits.reset_at < NOW() THEN 1
      ELSE rate_limits.count + 1
    END,
    reset_at = CASE 
      WHEN rate_limits.reset_at < NOW() THEN v_reset_at
      ELSE rate_limits.reset_at
    END,
    updated_at = NOW()
  RETURNING count, reset_at INTO v_count, v_reset_at;
  
  -- Calculate remaining requests
  v_remaining := GREATEST(0, p_max_requests - v_count);
  
  -- Check if allowed
  v_allowed := v_count <= p_max_requests;
  
  -- Return result
  RETURN QUERY SELECT v_allowed, v_remaining, v_reset_at, v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits 
  WHERE reset_at < NOW() - INTERVAL '1 hour'; -- Keep expired entries for 1 hour for debugging
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits TO service_role;

-- Create a scheduled job to clean up expired entries (if pg_cron is available)
-- Note: This requires pg_cron extension to be enabled
-- DO $$ BEGIN
--   PERFORM cron.schedule(
--     'cleanup-rate-limits',
--     '0 * * * *', -- Every hour
--     $$ SELECT cleanup_expired_rate_limits(); $$
--   );
-- EXCEPTION
--   WHEN undefined_function THEN
--     RAISE NOTICE 'pg_cron extension not available, skipping scheduled job';
-- END $$;

-- Add comment
COMMENT ON TABLE rate_limits IS 'Stores rate limit counters for persistent rate limiting across server instances';
COMMENT ON FUNCTION check_rate_limit IS 'Atomically checks and increments rate limit counter, returns whether request is allowed';
COMMENT ON FUNCTION cleanup_expired_rate_limits IS 'Cleans up expired rate limit entries older than 1 hour';

