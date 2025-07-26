'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { 
  listUserFiles, 
  deleteFile, 
  formatFileSize, 
  getUserStorageUsage,
  STORAGE_CONFIG 
} from '@/lib/storage'
import { createClientComponentClient } from '@/lib/supabase'
import {
  FileAudio,
  Download,
  Trash2,
  Play,
  Pause,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  HardDrive,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload
} from 'lucide-react'
import { FileRow } from './file-row'

interface FileItem {
  id: string
  name: string
  size: number
  created_at: string
  updated_at: string
  metadata: any
  publicUrl?: string
}

interface PodcastRecord {
  id: string
  title: string
  file_name: string
  file_size: number
  file_url: string
  status: 'uploaded' | 'processing' | 'completed' | 'error'
  created_at: string
  updated_at: string
}

type SortField = 'name' | 'size' | 'created_at' | 'status'
type SortOrder = 'asc' | 'desc'

export function FileManager() {
  const { user } = useAuth()
  const [files, setFiles] = useState<PodcastRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [storageUsage, setStorageUsage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  
  const supabase = createClientComponentClient()

  const fetchFiles = useCallback(async () => {
    if (!user) return

    try {
      setError(null)
      
      // Fetch podcast records from database
      const { data: podcasts, error: podcastError } = await supabase
        .from('podcasts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (podcastError) {
        throw podcastError
      }

      setFiles(podcasts || [])
      
      // Fetch storage usage
      const usage = await getUserStorageUsage(user.id)
      setStorageUsage(usage)
      
    } catch (err: any) {
      console.error('Error fetching files:', err)
      setError(err.message || 'Failed to load files')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchFiles()
  }

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('podcasts')
        .delete()
        .eq('id', fileId)

      if (dbError) {
        throw dbError
      }

      // Remove from local state
      setFiles(prev => prev.filter(f => f.id !== fileId))
      setSelectedFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })

      // Refresh storage usage
      const usage = await getUserStorageUsage(user!.id)
      setStorageUsage(usage)

    } catch (err: any) {
      console.error('Error deleting file:', err)
      alert('Failed to delete file: ' + err.message)
    }
  }

  const handleDownload = (file: PodcastRecord) => {
    if (file.file_url) {
      const link = document.createElement('a')
      link.href = file.file_url
      link.download = file.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handlePlay = (fileId: string) => {
    if (currentlyPlaying === fileId) {
      setCurrentlyPlaying(null)
    } else {
      setCurrentlyPlaying(fileId)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSelectFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return

    const fileNames = files
      .filter(f => selectedFiles.has(f.id))
      .map(f => f.file_name)
      .join(', ')

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} files?\n\n${fileNames}\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('podcasts')
        .delete()
        .in('id', Array.from(selectedFiles))

      if (dbError) {
        throw dbError
      }

      // Remove from local state
      setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)))
      setSelectedFiles(new Set())

      // Refresh storage usage
      const usage = await getUserStorageUsage(user!.id)
      setStorageUsage(usage)

    } catch (err: any) {
      console.error('Error deleting files:', err)
      alert('Failed to delete files: ' + err.message)
    }
  }

  // Filter and sort files
  const filteredFiles = files
    .filter(file => 
      file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (sortField === 'size') {
        aValue = a.file_size
        bValue = b.file_size
      } else if (sortField === 'name') {
        aValue = a.file_name.toLowerCase()
        bValue = b.file_name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Upload className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'processing':
        return 'Processing'
      case 'error':
        return 'Error'
      default:
        return 'Uploaded'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to view your files.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">File Manager</h2>
          <p className="text-gray-600 mt-1">
            {files.length} files • {formatFileSize(storageUsage)} used
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Storage Usage Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Storage Usage</span>
          </div>
          <span className="text-sm text-gray-600">
            {Math.round((storageUsage / STORAGE_CONFIG.MAX_USER_STORAGE) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.min((storageUsage / STORAGE_CONFIG.MAX_USER_STORAGE) * 100, 100)}%` 
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatFileSize(storageUsage)} used</span>
          <span>{formatFileSize(STORAGE_CONFIG.MAX_USER_STORAGE)} total</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedFiles.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File List */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <FileAudio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No files found' : 'No files uploaded yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? `No files match "${searchTerm}". Try a different search term.`
              : 'Upload your first podcast file to get started with AI-powered content generation.'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => window.location.href = '/upload'}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Upload Files
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex items-center space-x-2 mr-4">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Select All</span>
              </div>
              <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Name</span>
                    {sortField === 'name' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('size')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Size</span>
                    {sortField === 'size' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Status</span>
                    {sortField === 'status' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Date</span>
                    {sortField === 'created_at' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </div>
                <div className="col-span-2 text-center">Actions</div>
              </div>
            </div>
          </div>

          {/* File Rows */}
          <div className="divide-y divide-gray-200">
            {filteredFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                isSelected={selectedFiles.has(file.id)}
                isPlaying={currentlyPlaying === file.id}
                onSelect={() => handleSelectFile(file.id)}
                onPlay={() => handlePlay(file.id)}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file.id, file.file_name)}
                getStatusIcon={getStatusIcon}
                getStatusText={getStatusText}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
