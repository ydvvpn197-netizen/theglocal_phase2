-- Create Storage Bucket for Video Uploads
-- Version: 0083
-- Description: Create theglocal-videos bucket with proper RLS policies
-- Date: 2025-01-27

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================

-- Create the storage bucket for videos (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 
  'theglocal-videos',
  'theglocal-videos',
  true, -- Public bucket (anyone can read)
  104857600, -- 100MB file size limit (100 * 1024 * 1024)
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'theglocal-videos');

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Note: RLS policies for storage.objects require superuser privileges
-- The bucket is created with public=true which provides basic access
-- Additional policies can be managed through the Supabase Dashboard

-- ============================================
-- COMMENTS
-- ============================================

-- The theglocal-videos bucket is created with:
-- - 100MB file size limit for video uploads
-- - Public read access (anyone can view videos)
-- - Support for common video formats (MP4, WebM, QuickTime, AVI, MKV)
-- - RLS policies should be configured through Supabase Dashboard if needed
