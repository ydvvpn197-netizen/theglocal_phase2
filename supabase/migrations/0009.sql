-- Community System Enhancements Migration
-- Version: 0009
-- Description: Add categories, tags, improved constraints, and analytics columns
-- Date: 2025-10-09

-- ============================================
-- ADD COMMUNITY CATEGORIES AND TAGS
-- ============================================

-- Add category column to communities
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS activity_score INTEGER DEFAULT 0;

-- Create categories enum (for reference, but we'll use TEXT for flexibility)
COMMENT ON COLUMN communities.category IS 'Community category: local, interest, professional, events, marketplace, support, general';

-- ============================================
-- ADD COMMUNITY ANALYTICS COLUMNS
-- ============================================

ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS daily_active_members INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_active_members INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_active_members INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- ADD MEMBER ACTIVITY TRACKING
-- ============================================

ALTER TABLE community_members 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;

-- ============================================
-- ADD POST PINNING AND ANNOUNCEMENT FEATURES
-- ============================================

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES users(id);

-- ============================================
-- CREATE COMMUNITY RULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS community_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rule_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_rules_community ON community_rules(community_id);
CREATE INDEX IF NOT EXISTS idx_community_rules_order ON community_rules(community_id, rule_order);

-- ============================================
-- CREATE COMMUNITY INVITES TABLE (for private communities)
-- ============================================

CREATE TABLE IF NOT EXISTS community_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_invites_community ON community_invites(community_id);
CREATE INDEX IF NOT EXISTS idx_community_invites_code ON community_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_community_invites_user ON community_invites(invited_user_id);

-- ============================================
-- CREATE COMMUNITY JOIN REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS community_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_join_requests_community ON community_join_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_user ON community_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_status ON community_join_requests(status);

-- ============================================
-- ADD ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_activity_score ON communities(activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_communities_last_activity ON communities(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(community_id, is_pinned DESC, created_at DESC);

-- ============================================
-- FUNCTIONS FOR ACTIVITY TRACKING
-- ============================================

-- Function to update community activity on new post
CREATE OR REPLACE FUNCTION update_community_activity_on_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communities 
  SET 
    post_count = post_count + 1,
    last_post_at = NOW(),
    last_activity_at = NOW(),
    activity_score = activity_score + 10
  WHERE id = NEW.community_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update member post count
CREATE OR REPLACE FUNCTION increment_member_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_members 
  SET 
    post_count = post_count + 1,
    last_seen_at = NOW()
  WHERE community_id = NEW.community_id AND user_id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update member comment count
CREATE OR REPLACE FUNCTION increment_member_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_members cm
  SET 
    comment_count = comment_count + 1,
    last_seen_at = NOW()
  FROM posts p
  WHERE p.id = NEW.post_id 
    AND cm.community_id = p.community_id 
    AND cm.user_id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate activity score
CREATE OR REPLACE FUNCTION calculate_community_activity_score(community_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  recent_posts INTEGER;
  recent_comments INTEGER;
  member_count INTEGER;
BEGIN
  -- Count posts in last 7 days (10 points each)
  SELECT COUNT(*) INTO recent_posts
  FROM posts
  WHERE community_id = community_id_param
    AND created_at > NOW() - INTERVAL '7 days'
    AND is_deleted = false;
  
  score := score + (recent_posts * 10);
  
  -- Count comments in last 7 days (5 points each)
  SELECT COUNT(*) INTO recent_comments
  FROM comments c
  JOIN posts p ON c.post_id = p.id
  WHERE p.community_id = community_id_param
    AND c.created_at > NOW() - INTERVAL '7 days'
    AND c.is_deleted = false;
  
  score := score + (recent_comments * 5);
  
  -- Member count bonus (1 point per 10 members)
  SELECT communities.member_count INTO member_count
  FROM communities
  WHERE id = community_id_param;
  
  score := score + (member_count / 10);
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update community activity on new post
DROP TRIGGER IF EXISTS update_community_activity_on_post_trigger ON posts;
CREATE TRIGGER update_community_activity_on_post_trigger 
AFTER INSERT ON posts
FOR EACH ROW 
EXECUTE FUNCTION update_community_activity_on_post();

-- Trigger to increment member post count
DROP TRIGGER IF EXISTS increment_member_post_count_trigger ON posts;
CREATE TRIGGER increment_member_post_count_trigger 
AFTER INSERT ON posts
FOR EACH ROW 
EXECUTE FUNCTION increment_member_post_count();

-- Trigger to increment member comment count
DROP TRIGGER IF EXISTS increment_member_comment_count_trigger ON comments;
CREATE TRIGGER increment_member_comment_count_trigger 
AFTER INSERT ON comments
FOR EACH ROW 
EXECUTE FUNCTION increment_member_comment_count();

-- Trigger for community rules updated_at
CREATE TRIGGER update_community_rules_updated_at BEFORE UPDATE ON community_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- UPDATE EXISTING DATA
-- ============================================

-- Update last_activity_at for existing communities
UPDATE communities 
SET last_activity_at = created_at 
WHERE last_activity_at IS NULL;

-- Calculate initial activity scores for existing communities
UPDATE communities c
SET activity_score = calculate_community_activity_score(c.id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE community_rules IS 'Structured community rules for better moderation';
COMMENT ON TABLE community_invites IS 'Invitation system for private communities';
COMMENT ON TABLE community_join_requests IS 'Join requests for private communities requiring approval';
COMMENT ON COLUMN communities.activity_score IS 'Calculated activity score based on recent posts, comments, and members';
COMMENT ON COLUMN communities.category IS 'Community category for better organization and discovery';


