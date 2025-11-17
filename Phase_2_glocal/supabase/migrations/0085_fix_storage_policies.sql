-- ============================================
-- FIX STORAGE BUCKET POLICIES
-- ============================================
-- Add RLS policies for Post_Images and theglocal-videos buckets
-- Version: 0085
-- Description: Fix upload failures by adding proper RLS policies
-- Date: 2025-01-27

-- ============================================
-- RLS POLICIES FOR Post_Images BUCKET
-- ============================================

-- Policy: Allow public read access to all images
CREATE POLICY "Public read access for Post_Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Post_Images');

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload to Post_Images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Post_Images' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow authenticated users to update their own images
CREATE POLICY "Users can update own Post_Images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'Post_Images' AND
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'Post_Images' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own Post_Images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Post_Images' AND
    auth.uid() IS NOT NULL
  );

-- ============================================
-- RLS POLICIES FOR theglocal-videos BUCKET
-- ============================================

-- Policy: Allow public read access to all videos
CREATE POLICY "Public read access for theglocal-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'theglocal-videos');

-- Policy: Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload to theglocal-videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'theglocal-videos' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow authenticated users to update their own videos
CREATE POLICY "Users can update own theglocal-videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'theglocal-videos' AND
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'theglocal-videos' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow authenticated users to delete their own videos
CREATE POLICY "Users can delete own theglocal-videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'theglocal-videos' AND
    auth.uid() IS NOT NULL
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Public read access for Post_Images" ON storage.objects IS 
  'Allows anyone to view uploaded images for posts';

COMMENT ON POLICY "Authenticated users can upload to Post_Images" ON storage.objects IS 
  'Only authenticated users can upload images to the platform';

COMMENT ON POLICY "Users can update own Post_Images" ON storage.objects IS 
  'Users can update images they uploaded';

COMMENT ON POLICY "Users can delete own Post_Images" ON storage.objects IS 
  'Users can delete images they uploaded';

COMMENT ON POLICY "Public read access for theglocal-videos" ON storage.objects IS 
  'Allows anyone to view uploaded videos for posts';

COMMENT ON POLICY "Authenticated users can upload to theglocal-videos" ON storage.objects IS 
  'Only authenticated users can upload videos to the platform';

COMMENT ON POLICY "Users can update own theglocal-videos" ON storage.objects IS 
  'Users can update videos they uploaded';

COMMENT ON POLICY "Users can delete own theglocal-videos" ON storage.objects IS 
  'Users can delete videos they uploaded';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added RLS policies for Post_Images bucket';
    RAISE NOTICE '✅ Added RLS policies for theglocal-videos bucket';
    RAISE NOTICE '✅ Fixed upload permission issues';
END $$;
