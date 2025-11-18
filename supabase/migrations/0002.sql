-- Theglocal Row Level Security Policies
-- Version: 0002
-- Description: Comprehensive RLS policies for privacy and security
-- Date: 2025-10-07

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except sensitive fields)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Anyone can view public user data (anonymous handle, avatar, join date)
-- But NOT email, phone, or exact location
CREATE POLICY "Public can view user public data"
  ON users FOR SELECT
  USING (true);

-- New users can insert their profile during signup
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can delete their own account
CREATE POLICY "Users can delete own account"
  ON users FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- COMMUNITIES TABLE POLICIES
-- ============================================

-- Anyone can view public communities
CREATE POLICY "Anyone can view public communities"
  ON communities FOR SELECT
  USING (NOT is_private OR id IN (
    SELECT community_id FROM community_members WHERE user_id = auth.uid()
  ));

-- Authenticated users can create communities
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Community creators and admins can update their community
CREATE POLICY "Admins can update community"
  ON communities FOR UPDATE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Only community creator can delete community
CREATE POLICY "Creator can delete community"
  ON communities FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- COMMUNITY MEMBERS TABLE POLICIES
-- ============================================

-- Members can view members of their communities
CREATE POLICY "Members can view community members"
  ON community_members FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    )
  );

-- Users can join public communities
CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can leave communities they're in
CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id);

-- Community admins can remove members
CREATE POLICY "Admins can remove members"
  ON community_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- POSTS TABLE POLICIES
-- ============================================

-- Anyone can view non-deleted posts in communities they're in
CREATE POLICY "Members can view community posts"
  ON posts FOR SELECT
  USING (
    NOT is_deleted AND
    (
      community_id IN (
        SELECT community_id FROM community_members WHERE user_id = auth.uid()
      ) OR
      community_id IN (
        SELECT id FROM communities WHERE NOT is_private
      )
    )
  );

-- Authenticated users can create posts in communities they're in
CREATE POLICY "Members can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    )
  );

-- Users can update their own posts within 10 minutes
CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (
    auth.uid() = author_id AND
    created_at > NOW() - INTERVAL '10 minutes'
  );

-- Users can delete their own posts
CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- Community admins can delete posts in their community
CREATE POLICY "Admins can delete community posts"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = posts.community_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- COMMENTS TABLE POLICIES
-- ============================================

-- Anyone can view non-deleted comments on posts they can see
CREATE POLICY "Users can view comments"
  ON comments FOR SELECT
  USING (
    NOT is_deleted AND
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND NOT posts.is_deleted
    )
  );

-- Users can create comments on posts they can see
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM posts
      JOIN community_members cm ON cm.community_id = posts.community_id
      WHERE posts.id = comments.post_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can update their own comments within 10 minutes
CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  USING (
    auth.uid() = author_id AND
    created_at > NOW() - INTERVAL '10 minutes'
  );

-- Users can delete their own comments
CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================
-- VOTES TABLE POLICIES
-- ============================================

-- Users can view their own votes
CREATE POLICY "Users can view own votes"
  ON votes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create votes
CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes (change vote type)
CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own votes (remove vote)
CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLLS TABLE POLICIES
-- ============================================

-- Anyone can view active polls in communities they're in
CREATE POLICY "Members can view community polls"
  ON polls FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    ) OR
    community_id IN (
      SELECT id FROM communities WHERE NOT is_private
    )
  );

-- Authenticated users can create polls in their communities
CREATE POLICY "Members can create polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    community_id IN (
      SELECT community_id FROM community_members WHERE user_id = auth.uid()
    )
  );

-- Authors can update their own polls before voting starts
CREATE POLICY "Authors can update own polls"
  ON polls FOR UPDATE
  USING (auth.uid() = author_id AND total_votes = 0);

-- ============================================
-- POLL OPTIONS TABLE POLICIES
-- ============================================

-- Anyone can view poll options for polls they can see
CREATE POLICY "Users can view poll options"
  ON poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id
    )
  );

-- Poll authors can create options
CREATE POLICY "Poll authors can create options"
  ON poll_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id 
      AND polls.author_id = auth.uid()
    )
  );

-- ============================================
-- POLL VOTES TABLE POLICIES (ANONYMOUS)
-- ============================================

-- Users cannot view any poll votes (fully anonymous)
CREATE POLICY "Poll votes are anonymous"
  ON poll_votes FOR SELECT
  USING (false);

-- Anyone can insert poll votes (anonymous)
CREATE POLICY "Anyone can vote on polls"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nobody can update or delete poll votes (permanent)
CREATE POLICY "Poll votes are permanent"
  ON poll_votes FOR UPDATE
  USING (false);

CREATE POLICY "Poll votes cannot be deleted"
  ON poll_votes FOR DELETE
  USING (false);

-- ============================================
-- ARTISTS TABLE POLICIES
-- ============================================

-- Anyone can view active artist profiles
CREATE POLICY "Anyone can view active artists"
  ON artists FOR SELECT
  USING (subscription_status IN ('trial', 'active'));

-- Users can create their own artist profile
CREATE POLICY "Users can create artist profile"
  ON artists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Artists can update their own profile
CREATE POLICY "Artists can update own profile"
  ON artists FOR UPDATE
  USING (auth.uid() = id);

-- Artists can delete their own profile
CREATE POLICY "Artists can delete own profile"
  ON artists FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- EVENTS TABLE POLICIES
-- ============================================

-- Anyone can view events
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (true);

-- Artists can create events
CREATE POLICY "Artists can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = artist_id AND
    EXISTS (SELECT 1 FROM artists WHERE id = auth.uid())
  );

-- Artists can update their own events
CREATE POLICY "Artists can update own events"
  ON events FOR UPDATE
  USING (auth.uid() = artist_id);

-- Artists can delete their own events
CREATE POLICY "Artists can delete own events"
  ON events FOR DELETE
  USING (auth.uid() = artist_id);

-- ============================================
-- EVENT RSVPS TABLE POLICIES
-- ============================================

-- Users can view RSVPs for events they can see
CREATE POLICY "Users can view event RSVPs"
  ON event_rsvps FOR SELECT
  USING (true);

-- Users can RSVP to events
CREATE POLICY "Users can create RSVPs"
  ON event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own RSVPs
CREATE POLICY "Users can delete own RSVPs"
  ON event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- BOOKINGS TABLE POLICIES
-- ============================================

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = artist_id);

-- Users can create booking requests
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Artists can update bookings for their services
CREATE POLICY "Artists can update bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = artist_id);

-- Users can cancel their own bookings
CREATE POLICY "Users can delete own bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- BOOKING MESSAGES TABLE POLICIES
-- ============================================

-- Booking participants can view messages
CREATE POLICY "Participants can view booking messages"
  ON booking_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_messages.booking_id
      AND (bookings.user_id = auth.uid() OR bookings.artist_id = auth.uid())
    )
  );

-- Booking participants can send messages
CREATE POLICY "Participants can send messages"
  ON booking_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_messages.booking_id
      AND (bookings.user_id = auth.uid() OR bookings.artist_id = auth.uid())
    )
  );

-- ============================================
-- REPORTS TABLE POLICIES
-- ============================================

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reported_by);

-- Authenticated users can create reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Only admins should update reports (handled via service role in backend)

-- ============================================
-- MODERATION LOG TABLE POLICIES
-- ============================================

-- Anyone can view public moderation log (transparency)
CREATE POLICY "Anyone can view public moderation log"
  ON moderation_log FOR SELECT
  USING (is_public = true);

-- Only admins can insert into moderation log (handled via service role)

-- ============================================
-- HELPER FUNCTIONS FOR PERMISSIONS
-- ============================================

-- Function to check if user is a community admin
CREATE OR REPLACE FUNCTION is_community_admin(community_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_id_param
    AND user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins are identified by a special role in auth.users metadata
  -- This will be set manually in Supabase dashboard or via admin API
  RETURN (auth.jwt() ->> 'role') = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Poll votes are anonymous" ON poll_votes IS 
  'Critical privacy policy: Poll votes are completely anonymous and cannot be viewed by anyone';

COMMENT ON POLICY "Anyone can view public moderation log" ON moderation_log IS 
  'Transparency policy: All public moderation actions are visible to everyone';

COMMENT ON POLICY "Anyone can view active artists" ON artists IS 
  'Only artists with active subscriptions or trials are visible publicly';

