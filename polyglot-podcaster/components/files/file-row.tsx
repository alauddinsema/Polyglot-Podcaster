'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  FileAudio, 
  Download, 
  Trash2, 
  Play, 
  Pause, 
  MoreVertical,
  Calendar,
  ExternalLink,
  Edit3,
  Copy
} from 'lucide-react'
import { formatFileSize } from '@/lib/storage'

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

interface FileRowProps {
  file: PodcastRecord
  isSelected: boolean
  isPlaying: boolean
  onSelect: () => void
  onPlay: () => void
  onDownload: () => void
  onDelete: () => void
  getStatusIcon: (status: string) => JSX.Element
  getStatusText: (status: string) => string
  getStatusColor: (status: string) => string
}

export function FileRow({
  file,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
  onDownload,
  onDelete,
  getStatusIcon,
  getStatusText,
  getStatusColor
}: FileRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setAudioLoaded(true)
      setAudioDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime)
    }

    const handleError = () => {
      setAudioError(true)
      setAudioLoaded(false)
    }

    const handleEnded = () => {
      setAudioCurrentTime(0)
      // Don't auto-stop playing state to allow replay
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('error', handleError)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Control audio playback
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying && audioLoaded) {
      audio.play().catch(console.error)
    } else {
      audio.pause()
    }
  }, [isPlaying, audioLoaded])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(file.file_url)
      // You could add a toast notification here
      setShowMenu(false)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const handleViewDetails = () => {
    // Navigate to file details page
    window.location.href = `/files/${file.id}`
    setShowMenu(false)
  }

  return (
    <div className={`px-6 py-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={file.file_url}
        preload="metadata"
      />

      <div className="flex items-center">
        {/* Checkbox */}
        <div className="mr-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* File Info Grid */}
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          {/* Name Column */}
          <div className="col-span-4 flex items-center space-x-3">
            <div className="flex-shrink-0">
              <FileAudio className="w-8 h-8 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.title || file.file_name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {file.file_name}
              </p>
              {audioDuration && (
                <p className="text-xs text-gray-400">
                  Duration: {formatDuration(audioDuration)}
                </p>
              )}
            </div>
          </div>

          {/* Size Column */}
          <div className="col-span-2">
            <p className="text-sm text-gray-900">
              {formatFileSize(file.file_size)}
            </p>
          </div>

          {/* Status Column */}
          <div className="col-span-2">
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
              {getStatusIcon(file.status)}
              <span>{getStatusText(file.status)}</span>
            </div>
          </div>

          {/* Date Column */}
          <div className="col-span-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(file.created_at)}</span>
            </div>
          </div>

          {/* Actions Column */}
          <div className="col-span-2 flex items-center justify-center space-x-2">
            {/* Play/Pause Button */}
            {file.file_url && !audioError && (
              <button
                onClick={onPlay}
                disabled={!audioLoaded && !audioError}
                className="p-2 text-gray-400 hover:text-blue-600 focus:outline-none focus:text-blue-600 disabled:opacity-50"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={onDownload}
              className="p-2 text-gray-400 hover:text-green-600 focus:outline-none focus:text-green-600"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* More Actions Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                title="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleViewDetails}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                    
                    <button
                      onClick={handleCopyUrl}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy URL</span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button
                      onClick={onDelete}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Progress Bar (shown when playing) */}
      {isPlaying && audioLoaded && audioDuration && (
        <div className="mt-3 ml-12">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{formatDuration(audioCurrentTime)}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
              />
            </div>
            <span>{formatDuration(audioDuration)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
