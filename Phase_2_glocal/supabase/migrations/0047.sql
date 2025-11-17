-- ============================================
-- POST VIEWS TRACKING SYSTEM
-- ============================================

-- Add view_count column to posts table
ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0;

-- Create post_views table to track unique views
CREATE TABLE post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, session_id)
);

-- Create index for performance
CREATE INDEX idx_post_views_post_id ON post_views(post_id);
CREATE INDEX idx_post_views_viewed_at ON post_views(viewed_at);

-- RLS Policies for post_views
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert view records (for tracking)
CREATE POLICY "Anyone can track post views" ON post_views
  FOR INSERT WITH CHECK (true);

-- Anyone can read view records (for analytics)
CREATE POLICY "Anyone can read post views" ON post_views
  FOR SELECT USING (true);

-- Function to auto-increment view_count when new view is inserted
CREATE OR REPLACE FUNCTION increment_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET view_count = view_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment view_count
CREATE TRIGGER trigger_increment_post_view_count
  AFTER INSERT ON post_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_view_count();

-- Update existing posts to have view_count = 0 if NULL
UPDATE posts SET view_count = 0 WHERE view_count IS NULL;
