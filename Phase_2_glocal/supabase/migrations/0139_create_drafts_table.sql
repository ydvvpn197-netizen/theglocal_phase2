-- ============================================
-- DRAFTS TABLE
-- Version: 0139
-- Description: Auto-save drafts for posts and comments with 7-day expiration
-- Date: 2025-01-30
-- ============================================

SET search_path TO public;

-- Enable pgcrypto extension for gen_random_uuid() (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CREATE DRAFTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('post', 'comment')),
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  external_url TEXT,
  location_city TEXT,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  parent_id UUID, -- For comment drafts (parent comment)
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE, -- For comment drafts
  content JSONB DEFAULT '{}'::jsonb, -- For media_items and other metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_type ON drafts(type);
CREATE INDEX IF NOT EXISTS idx_drafts_expires_at ON drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_drafts_user_type ON drafts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_drafts_post_id ON drafts(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drafts_community_id ON drafts(community_id) WHERE community_id IS NOT NULL;

-- ============================================
-- CREATE FUNCTION TO AUTO-UPDATE EXPIRES_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_draft_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expires_at to 7 days from created_at (or now if created_at is older)
  NEW.expires_at := LEAST(NEW.created_at + INTERVAL '7 days', NOW() + INTERVAL '7 days');
  NEW.updated_at := NOW();
  IF NEW.last_saved_at IS NULL THEN
    NEW.last_saved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update expires_at on insert/update
CREATE TRIGGER trigger_update_draft_expires_at
  BEFORE INSERT OR UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_expires_at();

-- ============================================
-- CREATE FUNCTION TO CLEANUP EXPIRED DRAFTS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM drafts
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view their own drafts
CREATE POLICY "Users can view own drafts"
  ON drafts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own drafts
CREATE POLICY "Users can create own drafts"
  ON drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
  ON drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
  ON drafts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CREATE FUNCTION TO AUTO-CLEANUP ON SELECT
-- ============================================

-- Optional: Auto-cleanup expired drafts when querying (runs periodically)
-- This is a lightweight cleanup that runs occasionally
CREATE OR REPLACE FUNCTION auto_cleanup_expired_drafts_on_select()
RETURNS TRIGGER AS $$
BEGIN
  -- Only cleanup if random() < 0.01 (1% chance) to avoid performance impact
  IF random() < 0.01 THEN
    PERFORM cleanup_expired_drafts();
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We'll use a scheduled job or manual cleanup instead of trigger
-- to avoid performance impact on every SELECT

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission on cleanup function to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_drafts() TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE drafts IS 'Auto-saved drafts for posts and comments with 7-day expiration';
COMMENT ON COLUMN drafts.type IS 'Type of draft: post or comment';
COMMENT ON COLUMN drafts.content IS 'JSONB field for media_items and other metadata';
COMMENT ON COLUMN drafts.expires_at IS 'Auto-computed as created_at + 7 days';
COMMENT ON FUNCTION cleanup_expired_drafts() IS 'Deletes drafts older than 7 days, returns count of deleted rows';

