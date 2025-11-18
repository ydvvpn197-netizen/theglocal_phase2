-- Create Storage Bucket for Image Uploads
-- Version: 0018
-- Description: Create theglocal-uploads bucket with proper RLS policies
-- Date: 2025-01-15

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'theglocal-uploads',
  'theglocal-uploads',
  true, -- Public bucket (anyone can read)
  5242880, -- 5MB file size limit (5 * 1024 * 1024)
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ]
);

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Policy: Allow public read access to all files
CREATE POLICY "Public read access for uploaded files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'theglocal-uploads');

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'theglocal-uploads' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Users can update own uploaded files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'theglocal-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'theglocal-uploads' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own uploaded files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'theglocal-uploads' AND
    auth.uid() IS NOT NULL
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Public read access for uploaded files" ON storage.objects IS 
  'Allows anyone to view uploaded images for posts, profiles, etc.';

COMMENT ON POLICY "Authenticated users can upload files" ON storage.objects IS 
  'Only authenticated users can upload images to the platform';

COMMENT ON POLICY "Users can update own uploaded files" ON storage.objects IS 
  'Users can update files they uploaded (for editing posts with images)';

COMMENT ON POLICY "Users can delete own uploaded files" ON storage.objects IS 
  'Users can delete files they uploaded (for post deletion)';
