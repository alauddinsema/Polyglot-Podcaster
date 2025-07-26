# Supabase Storage Configuration Guide

This guide explains how to set up Supabase Storage for the Polyglot Podcaster application with proper security policies, file size limits, and access controls.

## 📋 Overview

The storage system is configured to:
- Store podcast audio files securely
- Enforce user-specific access controls
- Limit file sizes and types
- Automatically create podcast records when files are uploaded
- Track user storage usage

## 🚀 Quick Setup

### Option 1: Using SQL Script (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `storage-setup.sql`
4. Click **Run** to execute the script

### Option 2: Manual Setup via Dashboard

Follow the step-by-step instructions below.

## 📁 Storage Bucket Configuration

### 1. Create Storage Bucket

**Via Dashboard:**
1. Go to **Storage** in your Supabase dashboard
2. Click **Create Bucket**
3. Configure the bucket:
   - **Name**: `podcast-files`
   - **Public**: ✅ Enabled (for public file URLs)
   - **File size limit**: `104857600` (100MB)
   - **Allowed MIME types**: 
     - `audio/mpeg` (MP3)
     - `audio/wav` (WAV)
     - `audio/mp4` (MP4)
     - `audio/m4a` (M4A)
     - `audio/ogg` (OGG)
     - `audio/webm` (WebM)
     - `audio/aac` (AAC)
     - `audio/flac` (FLAC)

## 🔒 Security Policies

The following Row Level Security (RLS) policies are configured:

### 1. Upload Policy
- **Name**: "Users can upload files to their own folder"
- **Operation**: INSERT
- **Target**: Authenticated users
- **Rule**: Files must be uploaded to user's own folder (`user_id/filename`)

### 2. View Policy
- **Name**: "Users can view their own files"
- **Operation**: SELECT
- **Target**: Authenticated users
- **Rule**: Users can only see files in their own folder

### 3. Update Policy
- **Name**: "Users can update their own files"
- **Operation**: UPDATE
- **Target**: Authenticated users
- **Rule**: Users can only update files in their own folder

### 4. Delete Policy
- **Name**: "Users can delete their own files"
- **Operation**: DELETE
- **Target**: Authenticated users
- **Rule**: Users can only delete files in their own folder

### 5. Public Access Policy
- **Name**: "Public can view files"
- **Operation**: SELECT
- **Target**: Public
- **Rule**: Allows public access for file URLs (required for audio playback)

## 📊 Storage Limits & Quotas

### File Limits
- **Maximum file size**: 100MB per file
- **Supported formats**: MP3, WAV, MP4, M4A, OGG, WebM, AAC, FLAC
- **User storage limit**: 1GB per user (configurable)

### Usage Tracking
The system includes helper functions to track storage usage:

```sql
-- Get user's current storage usage
SELECT get_user_storage_usage('user-uuid-here');

-- Check if user can upload a file
SELECT can_user_upload('user-uuid-here', 50000000); -- 50MB file
```

## 🔄 Automatic Triggers

### File Upload Trigger
When a file is uploaded to the `podcast-files` bucket:

1. **Extracts user ID** from the file path
2. **Creates podcast record** in the `podcasts` table
3. **Sets initial status** to 'uploaded'
4. **Records file metadata** (name, size, URL)

This ensures every uploaded file automatically creates a corresponding database record.

## 🛠️ File Organization

Files are organized in the following structure:
```
podcast-files/
├── user-id-1/
│   ├── timestamp-filename1.mp3
│   ├── timestamp-filename2.wav
│   └── ...
├── user-id-2/
│   ├── timestamp-filename3.mp3
│   └── ...
└── ...
```

## 🔍 Verification

After setup, verify the configuration:

### 1. Check Bucket Creation
```sql
SELECT * FROM storage.buckets WHERE id = 'podcast-files';
```

### 2. Verify Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### 3. Test Upload (via application)
1. Sign in to the application
2. Go to the upload page
3. Try uploading an audio file
4. Verify the file appears in Storage and creates a podcast record

## 🚨 Troubleshooting

### Common Issues

**1. Upload fails with "Policy violation"**
- Ensure RLS policies are correctly configured
- Check that the file path follows the `user_id/filename` pattern

**2. Files not visible after upload**
- Verify the "Public can view files" policy is enabled
- Check bucket is set to public

**3. File size limit exceeded**
- Current limit is 100MB per file
- Adjust `file_size_limit` in the bucket configuration if needed

**4. Unsupported file type**
- Only audio files are allowed
- Check the `allowed_mime_types` array in bucket configuration

### Debug Queries

```sql
-- Check user's files
SELECT * FROM storage.objects 
WHERE bucket_id = 'podcast-files' 
  AND (storage.foldername(name))[1] = 'user-id-here';

-- Check storage usage
SELECT get_user_storage_usage('user-id-here'::uuid);

-- View recent uploads
SELECT * FROM storage.objects 
WHERE bucket_id = 'podcast-files' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 📈 Monitoring

### Storage Metrics
Monitor these key metrics:
- Total storage usage per user
- Upload success/failure rates
- File type distribution
- Average file sizes

### Performance Indexes
The setup includes optimized indexes for:
- Fast file lookups by user
- Efficient storage usage calculations
- Quick file metadata queries

## 🔧 Customization

### Adjusting File Size Limits
```sql
UPDATE storage.buckets 
SET file_size_limit = 209715200  -- 200MB
WHERE id = 'podcast-files';
```

### Adding New File Types
```sql
UPDATE storage.buckets 
SET allowed_mime_types = array_append(allowed_mime_types, 'audio/new-format')
WHERE id = 'podcast-files';
```

### Changing User Storage Quota
Modify the `can_user_upload` function to adjust the 1GB limit.

## ✅ Setup Checklist

- [ ] Storage bucket `podcast-files` created
- [ ] File size limit set to 100MB
- [ ] Audio MIME types configured
- [ ] RLS policies enabled and configured
- [ ] Upload trigger function created
- [ ] Helper functions for usage tracking created
- [ ] Performance indexes created
- [ ] Test upload completed successfully
- [ ] Podcast record created automatically

## 🔗 Related Files

- `storage-setup.sql` - Complete SQL setup script
- `components/upload/file-upload.tsx` - Frontend upload component
- Database schema includes `podcasts` table for file metadata
