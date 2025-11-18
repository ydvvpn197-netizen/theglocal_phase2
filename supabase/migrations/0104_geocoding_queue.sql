-- Geocoding Queue Table
-- Version: 0104
-- Description: Create geocoding_queue table for tracking geocoding attempts and failures
-- Date: 2025-01-27

SET search_path TO public;

-- Create geocoding_queue table
CREATE TABLE IF NOT EXISTS geocoding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  city TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_table_name CHECK (table_name IN ('users', 'communities', 'posts', 'artists', 'events', 'polls')),
  CONSTRAINT unique_table_record UNIQUE (table_name, record_id)
);

-- Create indexes for performance
CREATE INDEX idx_geocoding_queue_status ON geocoding_queue(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_geocoding_queue_table_record ON geocoding_queue(table_name, record_id);
CREATE INDEX idx_geocoding_queue_retry ON geocoding_queue(status, attempt_count, last_attempt_at);

-- Add RLS policies
ALTER TABLE geocoding_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on geocoding_queue"
  ON geocoding_queue
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow admins read access for monitoring
CREATE POLICY "Admins can view geocoding_queue"
  ON geocoding_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (is_admin = TRUE OR is_super_admin = TRUE)
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_geocoding_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER geocoding_queue_updated_at
BEFORE UPDATE ON geocoding_queue
FOR EACH ROW
EXECUTE FUNCTION update_geocoding_queue_updated_at();

-- Create function to increment attempt count atomically
CREATE OR REPLACE FUNCTION increment_geocoding_attempt_count(
  queue_item_id UUID,
  new_status TEXT,
  new_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE geocoding_queue
  SET 
    attempt_count = attempt_count + 1,
    last_attempt_at = NOW(),
    status = new_status,
    error_message = new_error_message,
    updated_at = NOW()
  WHERE id = queue_item_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE geocoding_queue IS 'Queue for tracking geocoding attempts and retries with exponential backoff';
COMMENT ON COLUMN geocoding_queue.status IS 'Status: pending (waiting), processing (in progress), completed (success), failed (max attempts reached)';
COMMENT ON COLUMN geocoding_queue.attempt_count IS 'Number of geocoding attempts made';
COMMENT ON COLUMN geocoding_queue.error_message IS 'Last error message if geocoding failed';

DO $$
BEGIN
  RAISE NOTICE '✅ Created geocoding_queue table with indexes and RLS policies';
  RAISE NOTICE '📝 Migration 0104 complete - ready for auto-geocoding system';
END$$;

