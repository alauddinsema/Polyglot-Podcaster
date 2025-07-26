'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileUpload } from '@/components/upload/file-upload'
import { ArrowLeft, Upload as UploadIcon } from 'lucide-react'

export default function UploadPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<Array<{url: string, name: string}>>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleUploadComplete = (fileUrl: string, fileName: string) => {
    setUploadedFiles(prev => [...prev, { url: fileUrl, name: fileName }])
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
    // Error is already handled in the FileUpload component
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
              <div className="h-6 border-l border-gray-300" />
              <div className="flex items-center">
                <UploadIcon className="w-6 h-6 text-blue-600 mr-2" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Upload Podcast
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Upload Your Podcast Files
          </h2>
          <p className="text-gray-600">
            Upload your audio files to start generating transcripts, translations, and content.
          </p>
        </div>

        {/* Upload Component */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </div>

        {/* Success Message */}
        {uploadedFiles.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-green-900 mb-2">
              Upload Successful! 🎉
            </h3>
            <p className="text-green-700 mb-4">
              Your files have been uploaded successfully. AI processing will begin shortly.
            </p>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center text-sm text-green-700">
                  <span className="font-medium">{file.name}</span>
                  <span className="ml-2 text-green-600">✓ Uploaded</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                View in Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}