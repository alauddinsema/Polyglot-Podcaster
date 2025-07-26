-- Supabase Storage Setup Verification Script
-- Run this script to verify that the storage configuration is correct

-- =====================================================
-- 1. VERIFY BUCKET CONFIGURATION
-- =====================================================

SELECT 
  'BUCKET VERIFICATION' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'podcast-files') 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'podcast-files bucket exists' as description;

SELECT 
  'BUCKET SETTINGS' as check_type,
  CASE 
    WHEN b.public = true AND b.file_size_limit = 104857600 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  CONCAT('Public: ', b.public, ', Size Limit: ', b.file_size_limit, ' bytes') as description
FROM storage.buckets b 
WHERE id = 'podcast-files';

SELECT 
  'MIME TYPES' as check_type,
  CASE 
    WHEN 'audio/mpeg' = ANY(b.allowed_mime_types) 
     AND 'audio/wav' = ANY(b.allowed_mime_types)
     AND 'audio/mp4' = ANY(b.allowed_mime_types)
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  CONCAT('Allowed types: ', array_length(b.allowed_mime_types, 1)) as description
FROM storage.buckets b 
WHERE id = 'podcast-files';

-- =====================================================
-- 2. VERIFY RLS POLICIES
-- =====================================================

SELECT 
  'RLS ENABLED' as check_type,
  CASE 
    WHEN c.relrowsecurity = true 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'Row Level Security enabled on storage.objects' as description
FROM pg_class c 
JOIN pg_namespace n ON c.relnamespace = n.oid 
WHERE n.nspname = 'storage' AND c.relname = 'objects';

-- Count and verify policies
WITH policy_check AS (
  SELECT COUNT(*) as policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname IN (
      'Users can upload files to their own folder',
      'Users can view their own files',
      'Users can update their own files',
      'Users can delete their own files',
      'Public can view files'
    )
)
SELECT 
  'STORAGE POLICIES' as check_type,
  CASE 
    WHEN policy_count = 5 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  CONCAT(policy_count, ' of 5 required policies found') as description
FROM policy_check;

-- List all storage policies for review
SELECT 
  'POLICY DETAILS' as check_type,
  '📋 INFO' as status,
  CONCAT(policyname, ' (', cmd, ')') as description
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================
-- 3. VERIFY HELPER FUNCTIONS
-- =====================================================

SELECT 
  'HELPER FUNCTIONS' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_storage_usage')
     AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_user_upload')
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'Storage utility functions exist' as description;

-- =====================================================
-- 4. VERIFY TRIGGERS
-- =====================================================

SELECT 
  'UPLOAD TRIGGER' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'storage' 
        AND c.relname = 'objects'
        AND t.tgname = 'on_podcast_file_upload'
    )
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'File upload trigger exists' as description;

SELECT 
  'TRIGGER FUNCTION' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_podcast_file_upload')
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'Trigger function exists' as description;

-- =====================================================
-- 5. VERIFY INDEXES
-- =====================================================

SELECT 
  'PERFORMANCE INDEXES' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_objects_user_folder')
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_objects_size')
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'Performance indexes exist' as description;

-- =====================================================
-- 6. VERIFY PODCASTS TABLE INTEGRATION
-- =====================================================

SELECT 
  'PODCASTS TABLE' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'podcasts')
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'Podcasts table exists for file metadata' as description;

-- Check required columns in podcasts table
SELECT 
  'PODCASTS COLUMNS' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name = 'file_url')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name = 'file_name')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name = 'file_size')
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'Required file columns exist in podcasts table' as description;

-- =====================================================
-- 7. TEST FUNCTIONS (Safe to run)
-- =====================================================

-- Test storage usage function with a dummy UUID
SELECT 
  'FUNCTION TEST' as check_type,
  CASE 
    WHEN get_user_storage_usage('00000000-0000-0000-0000-000000000000'::uuid) >= 0
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'get_user_storage_usage function works' as description;

-- Test upload permission function
SELECT 
  'FUNCTION TEST' as check_type,
  CASE 
    WHEN can_user_upload('00000000-0000-0000-0000-000000000000'::uuid, 1000000) IS NOT NULL
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status,
  'can_user_upload function works' as description;

-- =====================================================
-- 8. SUMMARY
-- =====================================================

SELECT 
  '📊 SETUP SUMMARY' as check_type,
  '📋 INFO' as status,
  'Storage configuration verification complete' as description;

-- Show bucket details
SELECT 
  'BUCKET DETAILS' as check_type,
  '📋 INFO' as status,
  CONCAT(
    'Name: ', name, 
    ', Public: ', public,
    ', Size Limit: ', ROUND(file_size_limit / 1024.0 / 1024.0, 0), 'MB',
    ', MIME Types: ', array_length(allowed_mime_types, 1)
  ) as description
FROM storage.buckets 
WHERE id = 'podcast-files';

-- Show policy count
SELECT 
  'SECURITY STATUS' as check_type,
  '📋 INFO' as status,
  CONCAT(
    'RLS Enabled: ', 
    CASE WHEN c.relrowsecurity THEN 'Yes' ELSE 'No' END,
    ', Policies: ',
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects')
  ) as description
FROM pg_class c 
JOIN pg_namespace n ON c.relnamespace = n.oid 
WHERE n.nspname = 'storage' AND c.relname = 'objects';

-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- If any checks fail, uncomment and run these queries for debugging:

-- List all storage buckets
-- SELECT * FROM storage.buckets;

-- List all storage policies
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'storage';

-- List all functions
-- SELECT proname, proargnames, prosrc 
-- FROM pg_proc 
-- WHERE proname IN ('get_user_storage_usage', 'can_user_upload', 'handle_podcast_file_upload');

-- List all triggers on storage.objects
-- SELECT t.tgname, c.relname, n.nspname
-- FROM pg_trigger t
-- JOIN pg_class c ON t.tgrelid = c.oid
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE n.nspname = 'storage' AND c.relname = 'objects';
