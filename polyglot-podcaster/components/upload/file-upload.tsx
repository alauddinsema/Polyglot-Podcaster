'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Upload, X, FileAudio, AlertCircle, CheckCircle } from 'lucide-react'
import {
  uploadFile,
  validateFile,
  formatFileSize,
  STORAGE_CONFIG,
  type UploadResult
} from '@/lib/storage'

interface FileUploadProps {
  onUploadComplete?: (fileUrl: string, fileName: string) => void
  onUploadError?: (error: string) => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  url?: string
}

export function FileUpload({ onUploadComplete, onUploadError }: FileUploadProps) {
  const { user } = useAuth()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateFileId = () => Math.random().toString(36).substring(2, 15)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const validFiles: UploadFile[] = []

    fileArray.forEach(file => {
      const validation = validateFile(file)
      const id = generateFileId()

      validFiles.push({
        file,
        id,
        progress: 0,
        status: validation.isValid ? 'pending' : 'error',
        error: validation.error
      })
    })

    setFiles(prev => [...prev, ...validFiles])

    // Start uploading valid files
    validFiles.forEach(uploadFileItem => {
      if (uploadFileItem.status === 'pending') {
        startUpload(uploadFileItem)
      }
    })
  }, [])

  const startUpload = async (uploadFileItem: UploadFile) => {
    if (!user) {
      setFiles(prev => prev.map(f =>
        f.id === uploadFileItem.id
          ? { ...f, status: 'error', error: 'Please sign in to upload files' }
          : f
      ))
      return
    }

    setFiles(prev => prev.map(f =>
      f.id === uploadFileItem.id ? { ...f, status: 'uploading' } : f
    ))

    try {
      const result: UploadResult = await uploadFile(
        uploadFileItem.file,
        user.id,
        (progress) => {
          const percentage = (progress.loaded / progress.total) * 100
          setFiles(prev => prev.map(f =>
            f.id === uploadFileItem.id ? { ...f, progress: percentage } : f
          ))
        }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      setFiles(prev => prev.map(f =>
        f.id === uploadFileItem.id
          ? { ...f, status: 'completed', progress: 100, url: result.data!.publicUrl }
          : f
      ))

      onUploadComplete?.(result.data!.publicUrl, result.data!.fileName)

    } catch (error: any) {
      console.error('Upload error:', error)
      const errorMessage = error.message || 'Upload failed. Please try again.'

      setFiles(prev => prev.map(f =>
        f.id === uploadFileItem.id
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ))

      onUploadError?.(errorMessage)
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [addFiles])



  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <Upload className="w-8 h-8 text-gray-600" />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload your podcast files
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop your audio files here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports {STORAGE_CONFIG.ALLOWED_EXTENSIONS.join(', ').toUpperCase()} • Max {formatFileSize(STORAGE_CONFIG.MAX_FILE_SIZE)} per file
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Choose Files
          </button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex-shrink-0">
                <FileAudio className="w-8 h-8 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadFile.file.size)}
                </p>

                {uploadFile.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadFile.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadFile.status === 'completed' && (
                  <div className="flex items-center mt-2 text-xs text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Upload completed
                  </div>
                )}

                {uploadFile.status === 'error' && (
                  <div className="flex items-center mt-2 text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {uploadFile.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}