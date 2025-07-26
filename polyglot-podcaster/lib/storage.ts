/**
 * Storage utilities for Polyglot Podcaster
 * Handles file uploads, validation, and storage management
 */

import { createClientComponentClient } from './supabase'

// Storage configuration constants
export const STORAGE_CONFIG = {
  BUCKET_NAME: 'podcast-files',
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_USER_STORAGE: 1024 * 1024 * 1024, // 1GB per user
  ALLOWED_MIME_TYPES: [
    'audio/mpeg',     // MP3
    'audio/wav',      // WAV
    'audio/mp4',      // MP4 audio
    'audio/m4a',      // M4A
    'audio/ogg',      // OGG
    'audio/webm',     // WebM audio
    'audio/aac',      // AAC
    'audio/flac'      // FLAC
  ],
  ALLOWED_EXTENSIONS: ['.mp3', '.wav', '.mp4', '.m4a', '.ogg', '.webm', '.aac', '.flac']
} as const

// File validation result interface
export interface FileValidationResult {
  isValid: boolean
  error?: string
  fileInfo?: {
    name: string
    size: number
    type: string
    extension: string
  }
}

// Upload progress callback type
export type UploadProgressCallback = (progress: { loaded: number; total: number }) => void

// Upload result interface
export interface UploadResult {
  success: boolean
  data?: {
    path: string
    publicUrl: string
    fileName: string
    fileSize: number
  }
  error?: string
}

/**
 * Validates a file for upload
 */
export function validateFile(file: File): FileValidationResult {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  
  // Check file size
  if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${formatFileSize(STORAGE_CONFIG.MAX_FILE_SIZE)}`
    }
  }
  
  // Check MIME type
  if (!STORAGE_CONFIG.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: 'Please upload an audio file (MP3, WAV, MP4, M4A, OGG, WebM, AAC, or FLAC)'
    }
  }
  
  // Check file extension as backup
  if (!STORAGE_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: 'File extension not supported. Please use: ' + STORAGE_CONFIG.ALLOWED_EXTENSIONS.join(', ')
    }
  }
  
  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension
    }
  }
}

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  try {
    const supabase = createClientComponentClient()
    
    // Validate file first
    const validation = validateFile(file)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }
    
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileName = `${userId}/${timestamp}-${file.name}`
    
    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: onProgress
      })
    
    if (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message || 'Upload failed. Please try again.'
      }
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .getPublicUrl(fileName)
    
    return {
      success: true,
      data: {
        path: data.path,
        publicUrl,
        fileName: file.name,
        fileSize: file.size
      }
    }
    
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error.message || 'Upload failed. Please try again.'
    }
  }
}

/**
 * Gets user's storage usage
 */
export async function getUserStorageUsage(userId: string): Promise<number> {
  try {
    const supabase = createClientComponentClient()
    
    const { data, error } = await supabase
      .rpc('get_user_storage_usage', { user_id: userId })
    
    if (error) {
      console.error('Error getting storage usage:', error)
      return 0
    }
    
    return data || 0
  } catch (error) {
    console.error('Error getting storage usage:', error)
    return 0
  }
}

/**
 * Checks if user can upload a file
 */
export async function canUserUpload(userId: string, fileSize: number): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    const { data, error } = await supabase
      .rpc('can_user_upload', { 
        user_id: userId,
        file_size: fileSize 
      })
    
    if (error) {
      console.error('Error checking upload permission:', error)
      return false
    }
    
    return data || false
  } catch (error) {
    console.error('Error checking upload permission:', error)
    return false
  }
}

/**
 * Lists user's uploaded files
 */
export async function listUserFiles(userId: string) {
  try {
    const supabase = createClientComponentClient()
    
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) {
      console.error('Error listing files:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error listing files:', error)
    return []
  }
}

/**
 * Deletes a file from storage
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .remove([filePath])
    
    if (error) {
      console.error('Error deleting file:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  return '.' + filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Checks if a file type is supported
 */
export function isFileTypeSupported(mimeType: string): boolean {
  return STORAGE_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any)
}

/**
 * Gets storage usage percentage for a user
 */
export async function getStorageUsagePercentage(userId: string): Promise<number> {
  const usage = await getUserStorageUsage(userId)
  return Math.round((usage / STORAGE_CONFIG.MAX_USER_STORAGE) * 100)
}

/**
 * Gets remaining storage space for a user
 */
export async function getRemainingStorage(userId: string): Promise<number> {
  const usage = await getUserStorageUsage(userId)
  return Math.max(0, STORAGE_CONFIG.MAX_USER_STORAGE - usage)
}
