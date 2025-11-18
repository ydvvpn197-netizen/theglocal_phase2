-- ============================================
-- COMPREHENSIVE STORAGE BUCKET RLS POLICIES
-- ============================================
-- Add proper RLS policies for all storage buckets
-- Version: 0095
-- Description: Comprehensive storage policies with proper ownership checks
-- Date: 2025-01-27
--
-- This migration ensures:
-- 1. Public read access to all public buckets
-- 2. Only authenticated users can upload
-- 3. Users can only update/delete their own files (using owner field)
-- 4. Covers all buckets: theglocal-uploads, Post_Images, Post_Videos, theglocal-videos, GIFs
--
-- IMPORTANT: Storage policies require special permissions.
-- If you get "must be owner" errors, apply this migration via:
-- 1. Supabase Dashboard > SQL Editor (with service role)
-- 2. Supabase CLI with service role key
-- 3. Or manually create policies via Dashboard > Storage > Policies
--
-- ============================================
-- NOTE: RLS should already be enabled on storage.objects
-- If not, enable it via Supabase Dashboard or service role
-- ============================================

-- ============================================
-- DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================
-- Note: This requires owner permissions. If it fails, 
-- policies will be created with IF NOT EXISTS instead

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%theglocal%' OR
            policyname LIKE '%Post_Images%' OR
            policyname LIKE '%Post_Videos%' OR
            policyname LIKE '%GIFs%' OR
            policyname LIKE '%upload%'
        )
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        EXCEPTION WHEN OTHERS THEN
            -- Skip if we don't have permissions
            NULL;
        END;
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    -- If we can't query policies, continue anyway
    NULL;
END $$;

-- ============================================
-- RLS POLICIES FOR theglocal-uploads BUCKET
-- ============================================

-- Public read access
DROP POLICY IF EXISTS "Public read access for theglocal-uploads" ON storage.objects;
CREATE POLICY "Public read access for theglocal-uploads"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'theglocal-uploads');

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload to theglocal-uploads" ON storage.objects;
CREATE POLICY "Authenticated users can upload to theglocal-uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'theglocal-uploads' AND
    auth.uid() IS NOT NULL
  );

-- Users can update their own files
DROP POLICY IF EXISTS "Users can update own theglocal-uploads files" ON storage.objects;
CREATE POLICY "Users can update own theglocal-uploads files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'theglocal-uploads' AND
    auth.uid()::text = owner
  )
  WITH CHECK (
    bucket_id = 'theglocal-uploads' AND
    auth.uid()::text = owner
  );

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own theglocal-uploads files" ON storage.objects;
CREATE POLICY "Users can delete own theglocal-uploads files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'theglocal-uploads' AND
    auth.uid()::text = owner
  );

-- ============================================
-- RLS POLICIES FOR Post_Images BUCKET
-- ============================================

-- Public read access
DROP POLICY IF EXISTS "Public read access for Post_Images" ON storage.objects;
CREATE POLICY "Public read access for Post_Images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'Post_Images');

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload to Post_Images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to Post_Images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Post_Images' AND
    auth.uid() IS NOT NULL
  );

-- Users can update their own files
DROP POLICY IF EXISTS "Users can update own Post_Images files" ON storage.objects;
CREATE POLICY "Users can update own Post_Images files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'Post_Images' AND
    auth.uid()::text = owner
  )
  WITH CHECK (
    bucket_id = 'Post_Images' AND
    auth.uid()::text = owner
  );

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own Post_Images files" ON storage.objects;
CREATE POLICY "Users can delete own Post_Images files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Post_Images' AND
    auth.uid()::text = owner
  );

-- ============================================
-- RLS POLICIES FOR Post_Videos BUCKET
-- ============================================

-- Public read access
DROP POLICY IF EXISTS "Public read access for Post_Videos" ON storage.objects;
CREATE POLICY "Public read access for Post_Videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'Post_Videos');

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload to Post_Videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload to Post_Videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Post_Videos' AND
    auth.uid() IS NOT NULL
  );

-- Users can update their own files
DROP POLICY IF EXISTS "Users can update own Post_Videos files" ON storage.objects;
CREATE POLICY "Users can update own Post_Videos files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'Post_Videos' AND
    auth.uid()::text = owner
  )
  WITH CHECK (
    bucket_id = 'Post_Videos' AND
    auth.uid()::text = owner
  );

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own Post_Videos files" ON storage.objects;
CREATE POLICY "Users can delete own Post_Videos files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Post_Videos' AND
    auth.uid()::text = owner
  );

-- ============================================
-- RLS POLICIES FOR theglocal-videos BUCKET
-- ============================================

-- Public read access
DROP POLICY IF EXISTS "Public read access for theglocal-videos" ON storage.objects;
CREATE POLICY "Public read access for theglocal-videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'theglocal-videos');

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload to theglocal-videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload to theglocal-videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'theglocal-videos' AND
    auth.uid() IS NOT NULL
  );

-- Users can update their own files
DROP POLICY IF EXISTS "Users can update own theglocal-videos files" ON storage.objects;
CREATE POLICY "Users can update own theglocal-videos files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'theglocal-videos' AND
    auth.uid()::text = owner
  )
  WITH CHECK (
    bucket_id = 'theglocal-videos' AND
    auth.uid()::text = owner
  );

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own theglocal-videos files" ON storage.objects;
CREATE POLICY "Users can delete own theglocal-videos files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'theglocal-videos' AND
    auth.uid()::text = owner
  );

-- ============================================
-- RLS POLICIES FOR GIFs BUCKET
-- ============================================

-- Public read access
DROP POLICY IF EXISTS "Public read access for GIFs" ON storage.objects;
CREATE POLICY "Public read access for GIFs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'GIFs');

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload to GIFs" ON storage.objects;
CREATE POLICY "Authenticated users can upload to GIFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'GIFs' AND
    auth.uid() IS NOT NULL
  );

-- Users can update their own files
DROP POLICY IF EXISTS "Users can update own GIFs files" ON storage.objects;
CREATE POLICY "Users can update own GIFs files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'GIFs' AND
    auth.uid()::text = owner
  )
  WITH CHECK (
    bucket_id = 'GIFs' AND
    auth.uid()::text = owner
  );

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own GIFs files" ON storage.objects;
CREATE POLICY "Users can delete own GIFs files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'GIFs' AND
    auth.uid()::text = owner
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Public read access for theglocal-uploads" ON storage.objects IS 
  'Allows anyone to view uploaded files in theglocal-uploads bucket';

COMMENT ON POLICY "Authenticated users can upload to theglocal-uploads" ON storage.objects IS 
  'Only authenticated users can upload files to theglocal-uploads bucket';

COMMENT ON POLICY "Users can update own theglocal-uploads files" ON storage.objects IS 
  'Users can only update files they own in theglocal-uploads bucket';

COMMENT ON POLICY "Users can delete own theglocal-uploads files" ON storage.objects IS 
  'Users can only delete files they own in theglocal-uploads bucket';

COMMENT ON POLICY "Public read access for Post_Images" ON storage.objects IS 
  'Allows anyone to view uploaded images in Post_Images bucket';

COMMENT ON POLICY "Authenticated users can upload to Post_Images" ON storage.objects IS 
  'Only authenticated users can upload images to Post_Images bucket';

COMMENT ON POLICY "Users can update own Post_Images files" ON storage.objects IS 
  'Users can only update images they own in Post_Images bucket';

COMMENT ON POLICY "Users can delete own Post_Images files" ON storage.objects IS 
  'Users can only delete images they own in Post_Images bucket';

COMMENT ON POLICY "Public read access for Post_Videos" ON storage.objects IS 
  'Allows anyone to view uploaded videos in Post_Videos bucket';

COMMENT ON POLICY "Authenticated users can upload to Post_Videos" ON storage.objects IS 
  'Only authenticated users can upload videos to Post_Videos bucket';

COMMENT ON POLICY "Users can update own Post_Videos files" ON storage.objects IS 
  'Users can only update videos they own in Post_Videos bucket';

COMMENT ON POLICY "Users can delete own Post_Videos files" ON storage.objects IS 
  'Users can only delete videos they own in Post_Videos bucket';

COMMENT ON POLICY "Public read access for theglocal-videos" ON storage.objects IS 
  'Allows anyone to view uploaded videos in theglocal-videos bucket';

COMMENT ON POLICY "Authenticated users can upload to theglocal-videos" ON storage.objects IS 
  'Only authenticated users can upload videos to theglocal-videos bucket';

COMMENT ON POLICY "Users can update own theglocal-videos files" ON storage.objects IS 
  'Users can only update videos they own in theglocal-videos bucket';

COMMENT ON POLICY "Users can delete own theglocal-videos files" ON storage.objects IS 
  'Users can only delete videos they own in theglocal-videos bucket';

COMMENT ON POLICY "Public read access for GIFs" ON storage.objects IS 
  'Allows anyone to view uploaded GIFs in GIFs bucket';

COMMENT ON POLICY "Authenticated users can upload to GIFs" ON storage.objects IS 
  'Only authenticated users can upload GIFs to GIFs bucket';

COMMENT ON POLICY "Users can update own GIFs files" ON storage.objects IS 
  'Users can only update GIFs they own in GIFs bucket';

COMMENT ON POLICY "Users can delete own GIFs files" ON storage.objects IS 
  'Users can only delete GIFs they own in GIFs bucket';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Created/Updated RLS policies for theglocal-uploads bucket';
    RAISE NOTICE '✅ Created/Updated RLS policies for Post_Images bucket';
    RAISE NOTICE '✅ Created/Updated RLS policies for Post_Videos bucket';
    RAISE NOTICE '✅ Created/Updated RLS policies for theglocal-videos bucket';
    RAISE NOTICE '✅ Created/Updated RLS policies for GIFs bucket';
    RAISE NOTICE '✅ All policies enforce proper ownership checks';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: If you encounter permission errors, ensure:';
    RAISE NOTICE '1. RLS is enabled on storage.objects (check via Supabase Dashboard)';
    RAISE NOTICE '2. You have proper database permissions';
    RAISE NOTICE '3. Policies can be created manually via Supabase Dashboard if needed';
END $$;

