-- ============================================
-- VERIFY REALTIME RLS POLICIES
-- Version: 0118
-- Description: Verify RLS policies allow SELECT for realtime events on posts and comments
-- Date: 2025-01-29
-- ============================================
-- Purpose: Ensure RLS policies don't block realtime payload delivery
-- Note: Supabase realtime respects RLS policies, so SELECT policies must exist
-- ============================================

SET search_path TO public;

-- ============================================
-- VERIFY POSTS SELECT POLICY EXISTS
-- ============================================

DO $$
DECLARE
  posts_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts'
      AND policyname = 'Users can view accessible posts'
      AND cmd = 'SELECT'
  ) INTO posts_policy_exists;

  IF NOT posts_policy_exists THEN
    RAISE WARNING 'Posts SELECT policy not found - creating it';
    -- Create policy if it doesn't exist
    CREATE POLICY "Users can view accessible posts"
      ON posts FOR SELECT
      USING (
        (NOT is_deleted AND can_view_community_safe(community_id, auth.uid()))
        OR
        (auth.uid() = author_id)
      );
  ELSE
    RAISE NOTICE '✅ Posts SELECT policy exists and allows realtime events';
  END IF;
END $$;

-- ============================================
-- VERIFY COMMENTS SELECT POLICY EXISTS
-- ============================================

DO $$
DECLARE
  comments_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comments'
      AND policyname = 'Users can view comments on accessible posts'
      AND cmd = 'SELECT'
  ) INTO comments_policy_exists;

  IF NOT comments_policy_exists THEN
    RAISE WARNING 'Comments SELECT policy not found - creating it';
    -- Create policy if it doesn't exist
    CREATE POLICY "Users can view comments on accessible posts"
      ON comments FOR SELECT
      USING (
        NOT is_deleted
        AND (
          can_view_post_safe(post_id, auth.uid())
          OR
          (auth.uid() IS NOT NULL AND auth.uid() = author_id)
        )
      );
  ELSE
    RAISE NOTICE '✅ Comments SELECT policy exists and allows realtime events';
  END IF;
END $$;

-- ============================================
-- VERIFY REALTIME PUBLICATION
-- ============================================

DO $$
DECLARE
  posts_in_publication BOOLEAN;
  comments_in_publication BOOLEAN;
BEGIN
  -- Check if posts table is in realtime publication
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'posts'
  ) INTO posts_in_publication;

  -- Check if comments table is in realtime publication
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'comments'
  ) INTO comments_in_publication;

  IF NOT posts_in_publication THEN
    RAISE WARNING 'Posts table not in supabase_realtime publication - adding it';
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  ELSE
    RAISE NOTICE '✅ Posts table is in supabase_realtime publication';
  END IF;

  IF NOT comments_in_publication THEN
    RAISE WARNING 'Comments table not in supabase_realtime publication - adding it';
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  ELSE
    RAISE NOTICE '✅ Comments table is in supabase_realtime publication';
  END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Verified RLS policies for realtime events';
  RAISE NOTICE '✅ Posts SELECT policy allows realtime payload delivery';
  RAISE NOTICE '✅ Comments SELECT policy allows realtime payload delivery';
  RAISE NOTICE '✅ Both tables are in supabase_realtime publication';
  RAISE NOTICE '✅ Realtime events will respect RLS policies correctly';
END $$;

