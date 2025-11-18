-- Create table for storing OAuth tokens for external platforms
-- Used for Meetup.com, Eventbrite, and other OAuth-based integrations

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL UNIQUE, -- 'meetup', 'eventbrite', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store additional platform-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster platform lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_platform ON oauth_tokens(platform);

-- Add index for expiration checks
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at) 
WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access OAuth tokens (admin only)
CREATE POLICY "Service role can manage oauth tokens"
  ON oauth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_tokens_updated_at_trigger
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_tokens_updated_at();

-- Comment on table
COMMENT ON TABLE oauth_tokens IS 'Stores OAuth access tokens for external event platforms (Meetup, Eventbrite, etc.)';
COMMENT ON COLUMN oauth_tokens.platform IS 'Platform identifier (e.g., meetup, eventbrite)';
COMMENT ON COLUMN oauth_tokens.access_token IS 'OAuth access token';
COMMENT ON COLUMN oauth_tokens.refresh_token IS 'OAuth refresh token (if available)';
COMMENT ON COLUMN oauth_tokens.expires_at IS 'Token expiration time';
COMMENT ON COLUMN oauth_tokens.metadata IS 'Additional platform-specific data (user_id, organization_id, etc.)';

