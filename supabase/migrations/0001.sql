-- Theglocal Database Schema Migration
-- Version: 0001
-- Description: Initial schema with all core tables for MVP
-- Date: 2025-10-07

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  anonymous_handle TEXT UNIQUE NOT NULL,
  avatar_seed TEXT NOT NULL, -- For generating deterministic avatar
  location_city TEXT,
  location_coordinates GEOGRAPHY(POINT),
  join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COMMUNITIES TABLE
-- ============================================
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  rules TEXT,
  location_city TEXT NOT NULL,
  location_coordinates GEOGRAPHY(POINT),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  post_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, location_city) -- Unique name per city
);

-- ============================================
-- COMMUNITY MEMBERS TABLE
-- ============================================
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- member, admin, moderator
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  location_city TEXT,
  location_coordinates GEOGRAPHY(POINT),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VOTES TABLE
-- ============================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'post' or 'comment'
  content_id UUID NOT NULL,
  vote_type TEXT NOT NULL, -- 'upvote' or 'downvote'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- ============================================
-- POLLS TABLE
-- ============================================
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT NOT NULL, -- Infrastructure, Safety, Events, Environment, General
  location_city TEXT NOT NULL,
  location_coordinates GEOGRAPHY(POINT),
  tagged_authority TEXT, -- Symbolic only, not a foreign key
  expires_at TIMESTAMPTZ NOT NULL,
  total_votes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_multiple_choice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- POLL OPTIONS TABLE
-- ============================================
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- POLL VOTES TABLE (ANONYMOUS)
-- ============================================
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  vote_hash TEXT NOT NULL, -- Anonymous hash identifier
  selected_option_ids UUID[] NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, vote_hash)
);

-- ============================================
-- ARTISTS TABLE
-- ============================================
CREATE TABLE artists (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  service_category TEXT NOT NULL, -- Musician, DJ, Photographer, etc.
  description TEXT,
  portfolio_images TEXT[], -- Array of image URLs
  location_city TEXT NOT NULL,
  location_coordinates GEOGRAPHY(POINT),
  rate_min INTEGER,
  rate_max INTEGER,
  subscription_status TEXT NOT NULL DEFAULT 'trial', -- trial, active, expired, cancelled
  subscription_start_date DATE,
  subscription_next_billing_date DATE,
  subscription_end_date DATE,
  trial_ends_at TIMESTAMPTZ,
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  profile_views INTEGER DEFAULT 0,
  rating_avg DECIMAL(3, 2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  external_event_id TEXT, -- For BookMyShow events
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location_city TEXT NOT NULL,
  location_address TEXT,
  location_coordinates GEOGRAPHY(POINT),
  category TEXT NOT NULL,
  ticket_info TEXT,
  external_booking_url TEXT, -- BookMyShow URL
  source TEXT NOT NULL, -- 'artist' or 'bookmyshow'
  rsvp_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EVENT RSVPS TABLE
-- ============================================
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  location TEXT NOT NULL,
  budget_range TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, info_requested, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- BOOKING MESSAGES TABLE
-- ============================================
CREATE TABLE booking_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL, -- post, comment, poll, message, user
  content_id UUID NOT NULL,
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- Spam, Harassment, Misinformation, Violence, NSFW, Other
  additional_context TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved
  assigned_to UUID REFERENCES users(id), -- Admin handling the report
  resolution TEXT, -- removed, dismissed, warned, temp_banned, banned
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MODERATION LOG TABLE (PUBLIC)
-- ============================================
CREATE TABLE moderation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  action_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- removed, warned, temp_banned, banned, dismissed
  reason TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_location ON users USING GIST(location_coordinates);
CREATE INDEX idx_users_city ON users(location_city);
CREATE INDEX idx_users_handle ON users(anonymous_handle);

-- Communities indexes
CREATE INDEX idx_communities_location ON communities USING GIST(location_coordinates);
CREATE INDEX idx_communities_city ON communities(location_city);
CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_communities_slug ON communities(slug);

-- Community members indexes
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);

-- Posts indexes
CREATE INDEX idx_posts_community ON posts(community_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_location ON posts USING GIST(location_coordinates);

-- Comments indexes
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Votes indexes
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_content ON votes(content_type, content_id);

-- Polls indexes
CREATE INDEX idx_polls_community ON polls(community_id);
CREATE INDEX idx_polls_location ON polls USING GIST(location_coordinates);
CREATE INDEX idx_polls_expires_at ON polls(expires_at);
CREATE INDEX idx_polls_created_at ON polls(created_at DESC);

-- Poll options indexes
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);

-- Poll votes indexes
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_hash ON poll_votes(vote_hash);

-- Artists indexes
CREATE INDEX idx_artists_location ON artists USING GIST(location_coordinates);
CREATE INDEX idx_artists_city ON artists(location_city);
CREATE INDEX idx_artists_category ON artists(service_category);
CREATE INDEX idx_artists_subscription_status ON artists(subscription_status);

-- Events indexes
CREATE INDEX idx_events_artist ON events(artist_id);
CREATE INDEX idx_events_location ON events USING GIST(location_coordinates);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_source ON events(source);

-- Event RSVPs indexes
CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user ON event_rsvps(user_id);

-- Bookings indexes
CREATE INDEX idx_bookings_artist ON bookings(artist_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);

-- Booking messages indexes
CREATE INDEX idx_booking_messages_booking ON booking_messages(booking_id);
CREATE INDEX idx_booking_messages_sender ON booking_messages(sender_id);

-- Reports indexes
CREATE INDEX idx_reports_content ON reports(content_type, content_id);
CREATE INDEX idx_reports_reported_by ON reports(reported_by);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_assigned_to ON reports(assigned_to);

-- Moderation log indexes
CREATE INDEX idx_moderation_log_community ON moderation_log(community_id);
CREATE INDEX idx_moderation_log_action_by ON moderation_log(action_by);
CREATE INDEX idx_moderation_log_created_at ON moderation_log(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment community member count
CREATE OR REPLACE FUNCTION increment_community_members()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communities 
  SET member_count = member_count + 1 
  WHERE id = NEW.community_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement community member count
CREATE OR REPLACE FUNCTION decrement_community_members()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communities 
  SET member_count = member_count - 1 
  WHERE id = OLD.community_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to increment post comment count
CREATE OR REPLACE FUNCTION increment_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comment_count = comment_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement post comment count
CREATE OR REPLACE FUNCTION decrement_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comment_count = comment_count - 1 
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to increment RSVP count
CREATE OR REPLACE FUNCTION increment_event_rsvps()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events 
  SET rsvp_count = rsvp_count + 1 
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement RSVP count
CREATE OR REPLACE FUNCTION decrement_event_rsvps()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events 
  SET rsvp_count = rsvp_count - 1 
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Community member count triggers
CREATE TRIGGER increment_community_members_trigger AFTER INSERT ON community_members
  FOR EACH ROW EXECUTE FUNCTION increment_community_members();

CREATE TRIGGER decrement_community_members_trigger AFTER DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION decrement_community_members();

-- Post comment count triggers
CREATE TRIGGER increment_post_comments_trigger AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION increment_post_comments();

CREATE TRIGGER decrement_post_comments_trigger AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION decrement_post_comments();

-- Event RSVP count triggers
CREATE TRIGGER increment_event_rsvps_trigger AFTER INSERT ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION increment_event_rsvps();

CREATE TRIGGER decrement_event_rsvps_trigger AFTER DELETE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION decrement_event_rsvps();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'Core user accounts with minimal PII, anonymized by default';
COMMENT ON TABLE communities IS 'Location-based communities for discussion';
COMMENT ON TABLE posts IS 'User posts within communities';
COMMENT ON TABLE polls IS 'Community polls with anonymous voting';
COMMENT ON TABLE poll_votes IS 'Anonymous poll votes using hash identifiers';
COMMENT ON TABLE artists IS 'Artist profiles with subscription management';
COMMENT ON TABLE moderation_log IS 'Public, transparent log of all moderation actions';

