'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClientComponentClient } from '@/lib/supabase'
import { formatFileSize } from '@/lib/storage'
import { 
  ArrowLeft, 
  FileAudio, 
  Download, 
  Trash2, 
  Play, 
  Pause,
  Calendar,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Edit3,
  Save,
  X
} from 'lucide-react'

interface PodcastRecord {
  id: string
  title: string
  file_name: string
  file_size: number
  file_url: string
  status: 'uploaded' | 'processing' | 'completed' | 'error'
  created_at: string
  updated_at: string
  user_id: string
}

export default function FileDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [file, setFile] = useState<PodcastRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)
  
  const supabase = createClientComponentClient()
  const fileId = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
      return
    }

    if (user && fileId) {
      fetchFileDetails()
    }
  }, [user, authLoading, fileId])

  const fetchFileDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('podcasts')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', user!.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('File not found or you do not have permission to view it.')
        } else {
          throw fetchError
        }
        return
      }

      setFile(data)
      setEditTitle(data.title || data.file_name)
    } catch (err: any) {
      console.error('Error fetching file details:', err)
      setError(err.message || 'Failed to load file details')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!file || !editTitle.trim()) return

    try {
      setSaving(true)

      const { error: updateError } = await supabase
        .from('podcasts')
        .update({ title: editTitle.trim() })
        .eq('id', file.id)

      if (updateError) {
        throw updateError
      }

      setFile(prev => prev ? { ...prev, title: editTitle.trim() } : null)
      setIsEditing(false)
    } catch (err: any) {
      console.error('Error updating title:', err)
      alert('Failed to update title: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!file) return

    if (!confirm(`Are you sure you want to delete "${file.title || file.file_name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('podcasts')
        .delete()
        .eq('id', file.id)

      if (deleteError) {
        throw deleteError
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error deleting file:', err)
      alert('Failed to delete file: ' + err.message)
    }
  }

  const handleDownload = () => {
    if (file?.file_url) {
      const link = document.createElement('a')
      link.href = file.file_url
      link.download = file.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Upload className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Processing Complete'
      case 'processing':
        return 'Processing in Progress'
      case 'error':
        return 'Processing Error'
      default:
        return 'Uploaded'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!file) {
    return null
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
                <FileAudio className="w-6 h-6 text-blue-600 mr-2" />
                <h1 className="text-xl font-semibold text-gray-900">
                  File Details
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">File Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Title</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter file title..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveTitle}
                      disabled={saving || !editTitle.trim()}
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditTitle(file.title || file.file_name)
                      }}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {file.title || file.file_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {file.file_name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Player */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audio Player</h3>
              <div className="space-y-4">
                <audio
                  controls
                  className="w-full"
                  src={file.file_url}
                  preload="metadata"
                >
                  Your browser does not support the audio element.
                </audio>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>File: {file.file_name}</span>
                  <span>Size: {formatFileSize(file.file_size)}</span>
                </div>
              </div>
            </div>

            {/* Processing Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Status</h3>
              <div className={`flex items-center space-x-3 p-4 border rounded-lg ${getStatusColor(file.status)}`}>
                {getStatusIcon(file.status)}
                <div>
                  <p className="font-medium">{getStatusText(file.status)}</p>
                  <p className="text-sm opacity-75">
                    {file.status === 'completed' && 'Your file has been processed and content is ready.'}
                    {file.status === 'processing' && 'AI is currently processing your file. This may take a few minutes.'}
                    {file.status === 'error' && 'There was an error processing your file. Please try uploading again.'}
                    {file.status === 'uploaded' && 'Your file has been uploaded and is queued for processing.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* File Metadata */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">File Details</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">File Size</p>
                    <p className="text-sm text-gray-600">{formatFileSize(file.file_size)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload Date</p>
                    <p className="text-sm text-gray-600">{formatDate(file.created_at)}</p>
                  </div>
                </div>

                {file.updated_at !== file.created_at && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Updated</p>
                      <p className="text-sm text-gray-600">{formatDate(file.updated_at)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <FileAudio className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">File Type</p>
                    <p className="text-sm text-gray-600">
                      {file.file_name.split('.').pop()?.toUpperCase() || 'Audio'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </button>

                {file.status === 'completed' && (
                  <button
                    onClick={() => router.push(`/content/${file.id}`)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>View Generated Content</span>
                  </button>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete File</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {file.status === 'completed' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Content Generated</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">1</p>
                    <p className="text-xs text-blue-600">Transcript</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">3</p>
                    <p className="text-xs text-green-600">Translations</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">1</p>
                    <p className="text-xs text-purple-600">Show Notes</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">5</p>
                    <p className="text-xs text-orange-600">Social Posts</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
