'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { 
  getUserStorageUsage, 
  formatFileSize, 
  STORAGE_CONFIG,
  getStorageUsagePercentage,
  getRemainingStorage 
} from '@/lib/storage'
import { HardDrive, AlertTriangle, CheckCircle } from 'lucide-react'

export function StorageUsage() {
  const { user } = useAuth()
  const [usage, setUsage] = useState<number>(0)
  const [percentage, setPercentage] = useState<number>(0)
  const [remaining, setRemaining] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchStorageData = async () => {
      try {
        setLoading(true)
        const [currentUsage, usagePercentage, remainingSpace] = await Promise.all([
          getUserStorageUsage(user.id),
          getStorageUsagePercentage(user.id),
          getRemainingStorage(user.id)
        ])

        setUsage(currentUsage)
        setPercentage(usagePercentage)
        setRemaining(remainingSpace)
      } catch (error) {
        console.error('Error fetching storage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStorageData()
  }, [user])

  if (!user || loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const getStatusIcon = () => {
    if (percentage >= 90) return <AlertTriangle className="w-5 h-5 text-red-600" />
    if (percentage >= 75) return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    return <CheckCircle className="w-5 h-5 text-green-600" />
  }

  const getStatusMessage = () => {
    if (percentage >= 90) return 'Storage almost full'
    if (percentage >= 75) return 'Storage getting full'
    return 'Storage healthy'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Storage Usage</h3>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusMessage()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{formatFileSize(usage)} used</span>
          <span>{percentage}% of {formatFileSize(STORAGE_CONFIG.MAX_USER_STORAGE)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Storage Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Used Space</p>
          <p className="font-medium text-gray-900">{formatFileSize(usage)}</p>
        </div>
        <div>
          <p className="text-gray-600">Available Space</p>
          <p className="font-medium text-gray-900">{formatFileSize(remaining)}</p>
        </div>
      </div>

      {/* Storage Limits Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Storage Limits</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Max file size:</span>
            <span>{formatFileSize(STORAGE_CONFIG.MAX_FILE_SIZE)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total storage:</span>
            <span>{formatFileSize(STORAGE_CONFIG.MAX_USER_STORAGE)}</span>
          </div>
          <div className="flex justify-between">
            <span>Supported formats:</span>
            <span>{STORAGE_CONFIG.ALLOWED_EXTENSIONS.length} types</span>
          </div>
        </div>
      </div>

      {/* Warning Messages */}
      {percentage >= 90 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-900">Storage Almost Full</p>
              <p className="text-red-700 mt-1">
                You're using {percentage}% of your storage. Consider deleting old files to free up space.
              </p>
            </div>
          </div>
        </div>
      )}

      {percentage >= 75 && percentage < 90 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900">Storage Getting Full</p>
              <p className="text-yellow-700 mt-1">
                You're using {percentage}% of your storage. You have {formatFileSize(remaining)} remaining.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
