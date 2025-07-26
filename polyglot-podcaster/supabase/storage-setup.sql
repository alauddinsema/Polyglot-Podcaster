-- Supabase Storage Configuration for Polyglot Podcaster
-- This script sets up the storage bucket and security policies for podcast file uploads

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

-- Create the podcast-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcast-files',
  'podcast-files',
  true, -- Public bucket for easy file access
  104857600, -- 100MB file size limit (100 * 1024 * 1024 bytes)
  ARRAY[
    'audio/mpeg',     -- MP3
    'audio/wav',      -- WAV
    'audio/mp4',      -- MP4 audio
    'audio/m4a',      -- M4A
    'audio/ogg',      -- OGG
    'audio/webm',     -- WebM audio
    'audio/aac',      -- AAC
    'audio/flac'      -- FLAC
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 2. STORAGE SECURITY POLICIES
-- =====================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;

-- Policy 1: Users can upload files to their own folder
CREATE POLICY "Users can upload files to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'podcast-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND array_length(storage.foldername(name), 1) = 2
);

-- Policy 2: Users can view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'podcast-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'podcast-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'podcast-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'podcast-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: Public can view files (for public URLs)
CREATE POLICY "Public can view files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'podcast-files');

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to get user's storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_id UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(metadata->>'size')::BIGINT, 0)
  FROM storage.objects
  WHERE bucket_id = 'podcast-files'
    AND (storage.foldername(name))[1] = user_id::text;
$$;

-- Function to check if user can upload more files
CREATE OR REPLACE FUNCTION can_user_upload(user_id UUID, file_size BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT (get_user_storage_usage(user_id) + file_size) <= 1073741824; -- 1GB limit per user
$$;

-- =====================================================
-- 4. STORAGE TRIGGERS
-- =====================================================

-- Function to update podcast record when file is uploaded
CREATE OR REPLACE FUNCTION handle_podcast_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  file_name TEXT;
  file_size BIGINT;
BEGIN
  -- Extract user ID from file path
  user_id := ((storage.foldername(NEW.name))[1])::UUID;
  
  -- Extract file name (remove timestamp prefix)
  file_name := regexp_replace(
    (storage.foldername(NEW.name))[2], 
    '^\d+-', 
    ''
  );
  
  -- Get file size
  file_size := (NEW.metadata->>'size')::BIGINT;
  
  -- Insert or update podcast record
  INSERT INTO podcasts (
    id,
    user_id,
    title,
    file_url,
    file_name,
    file_size,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    user_id,
    regexp_replace(file_name, '\.[^.]*$', ''), -- Remove file extension for title
    NEW.name,
    file_name,
    file_size,
    'uploaded',
    NOW(),
    NOW()
  )
  ON CONFLICT (file_url) DO UPDATE SET
    updated_at = NOW(),
    status = 'uploaded';
  
  RETURN NEW;
END;
$$;

-- Create trigger for file uploads
DROP TRIGGER IF EXISTS on_podcast_file_upload ON storage.objects;
CREATE TRIGGER on_podcast_file_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'podcast-files')
  EXECUTE FUNCTION handle_podcast_file_upload();

-- =====================================================
-- 5. STORAGE BUCKET POLICIES (Additional Security)
-- =====================================================

-- Enable RLS on storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Policy for bucket access
DROP POLICY IF EXISTS "Podcast files bucket is accessible" ON storage.buckets;
CREATE POLICY "Podcast files bucket is accessible"
ON storage.buckets
FOR SELECT
TO public
USING (id = 'podcast-files');

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for faster file lookups by user
CREATE INDEX IF NOT EXISTS idx_storage_objects_user_folder 
ON storage.objects (bucket_id, ((storage.foldername(name))[1]));

-- Index for faster file size calculations
CREATE INDEX IF NOT EXISTS idx_storage_objects_size 
ON storage.objects (bucket_id, ((metadata->>'size')::BIGINT));

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify the setup
SELECT 
  'Storage bucket created' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'podcast-files';
