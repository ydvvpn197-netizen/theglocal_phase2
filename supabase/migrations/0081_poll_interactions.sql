-- ============================================
-- POLL INTERACTIONS MIGRATION
-- ============================================
-- Add upvote/downvote and comment support to polls

-- Add interaction columns to polls table
ALTER TABLE polls 
ADD COLUMN upvotes INTEGER DEFAULT 0,
ADD COLUMN downvotes INTEGER DEFAULT 0,
ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Update votes table to support polls
-- The content_type constraint already allows any text, so we just need to ensure
-- the application logic handles 'poll' as a valid content_type

-- Create poll_comments table (similar to comments but for polls)
CREATE TABLE poll_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES poll_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for poll_comments
CREATE INDEX idx_poll_comments_poll_id ON poll_comments(poll_id);
CREATE INDEX idx_poll_comments_parent_comment_id ON poll_comments(parent_comment_id);
CREATE INDEX idx_poll_comments_author_id ON poll_comments(author_id);
CREATE INDEX idx_poll_comments_created_at ON poll_comments(created_at);

-- Indexes for polls interaction columns
CREATE INDEX idx_polls_upvotes ON polls(upvotes);
CREATE INDEX idx_polls_downvotes ON polls(downvotes);
CREATE INDEX idx_polls_comment_count ON polls(comment_count);

-- Function to update poll comment count
CREATE OR REPLACE FUNCTION update_poll_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE polls 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.poll_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE polls 
    SET comment_count = GREATEST(comment_count - 1, 0) 
    WHERE id = OLD.poll_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update poll comment count
CREATE TRIGGER trigger_update_poll_comment_count
  AFTER INSERT OR DELETE ON poll_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_comment_count();

-- Function to update poll vote counts
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_type = 'poll' THEN
      IF NEW.vote_type = 'upvote' THEN
        UPDATE polls SET upvotes = upvotes + 1 WHERE id = NEW.content_id;
      ELSIF NEW.vote_type = 'downvote' THEN
        UPDATE polls SET downvotes = downvotes + 1 WHERE id = NEW.content_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote changes
    IF NEW.content_type = 'poll' THEN
      -- Remove old vote
      IF OLD.vote_type = 'upvote' THEN
        UPDATE polls SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.content_id;
      ELSIF OLD.vote_type = 'downvote' THEN
        UPDATE polls SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.content_id;
      END IF;
      -- Add new vote
      IF NEW.vote_type = 'upvote' THEN
        UPDATE polls SET upvotes = upvotes + 1 WHERE id = NEW.content_id;
      ELSIF NEW.vote_type = 'downvote' THEN
        UPDATE polls SET downvotes = downvotes + 1 WHERE id = NEW.content_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_type = 'poll' THEN
      IF OLD.vote_type = 'upvote' THEN
        UPDATE polls SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.content_id;
      ELSIF OLD.vote_type = 'downvote' THEN
        UPDATE polls SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.content_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update poll vote counts
CREATE TRIGGER trigger_update_poll_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_vote_counts();

-- RLS policies for poll_comments
ALTER TABLE poll_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read poll comments
CREATE POLICY "Anyone can read poll comments" ON poll_comments
  FOR SELECT USING (true);

-- Policy: Authenticated users can create poll comments
CREATE POLICY "Authenticated users can create poll comments" ON poll_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their own poll comments
CREATE POLICY "Users can update their own poll comments" ON poll_comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Policy: Users can delete their own poll comments
CREATE POLICY "Users can delete their own poll comments" ON poll_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Grant permissions
GRANT ALL ON poll_comments TO authenticated;
GRANT ALL ON poll_comments TO service_role;
