import React, { useContext, useEffect, useState } from 'react'
import { MaiaEngineContext } from 'src/contexts'
import { MaiaModelStorage } from 'src/lib/engine/storage'

interface StorageInfo {
  supported: boolean
  quota?: number
  usage?: number
  modelSize?: number
  modelTimestamp?: number
}

export const MaiaModelSettings: React.FC = () => {
  const { status, progress, downloadModel } = useContext(MaiaEngineContext)
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [storage] = useState(() => new MaiaModelStorage())

  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const info = await storage.getStorageInfo()
        setStorageInfo(info)
      } catch (error) {
        console.error('Failed to get storage info:', error)
      }
    }

    fetchStorageInfo()
  }, [storage, status])

  const handleDeleteModel = async () => {
    if (
      !confirm(
        'Are you sure you want to delete the Maia model? You will need to re-download it to use Maia analysis.',
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await storage.clearAllStorage()
      // Refresh storage info
      const info = await storage.getStorageInfo()
      setStorageInfo(info)
    } catch (error) {
      console.error('Failed to delete model:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRedownloadModel = () => {
    downloadModel()
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'loading':
        return {
          icon: 'hourglass_empty',
          text: 'Initializing...',
          color: 'text-blue-500',
        }
      case 'no-cache':
        return {
          icon: 'download',
          text: 'Not downloaded',
          color: 'text-orange-500',
        }
      case 'downloading':
        return {
          icon: 'downloading',
          text: `Downloading... ${Math.round(progress)}%`,
          color: 'text-human-4',
        }
      case 'ready':
        return {
          icon: 'check_circle',
          text: 'Ready',
          color: 'text-green-500',
        }
      case 'error':
        return {
          icon: 'error',
          text: 'Error',
          color: 'text-red-500',
        }
      default:
        return {
          icon: 'help',
          text: 'Unknown',
          color: 'text-gray-500',
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-background-1 p-6">
      <div className="flex flex-col items-start justify-between">
        <h3 className="text-lg font-semibold">Maia Neural Network Model</h3>
        <p className="text-sm text-secondary">
          Manage your locally stored Maia chess engine model. The model is
          downloaded once and stored in your browser for offline use.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {/* Status Display */}
        <div className="rounded-lg bg-background-2 p-4">
          <div className="flex items-center gap-3">
            <span
              className={`material-symbols-outlined text-xl ${statusDisplay.color}`}
            >
              {statusDisplay.icon}
            </span>
            <div className="flex flex-col">
              <p className="font-medium">Model Status</p>
              <p className={`text-sm ${statusDisplay.color}`}>
                {statusDisplay.text}
              </p>
            </div>
          </div>

          {status === 'downloading' && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-background-2">
                <div
                  className="h-2 rounded-full bg-human-4 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Storage Information */}
        {storageInfo && (
          <div className="rounded-lg bg-background-2 p-4">
            <h4 className="mb-3 font-medium">Storage Information</h4>
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              {storageInfo.modelSize && (
                <div className="flex justify-between">
                  <span className="text-secondary">Model Size:</span>
                  <span>{formatBytes(storageInfo.modelSize)}</span>
                </div>
              )}
              {storageInfo.modelTimestamp && (
                <div className="flex justify-between">
                  <span className="text-secondary">Downloaded:</span>
                  <span>{formatDate(storageInfo.modelTimestamp)}</span>
                </div>
              )}
              {storageInfo.usage && (
                <div className="flex justify-between">
                  <span className="text-secondary">Total Usage:</span>
                  <span>{formatBytes(storageInfo.usage)}</span>
                </div>
              )}
              {storageInfo.quota && (
                <div className="flex justify-between">
                  <span className="text-secondary">Available:</span>
                  <span>{formatBytes(storageInfo.quota)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 md:flex-row">
          {status === 'no-cache' && (
            <button
              onClick={handleRedownloadModel}
              className="flex items-center justify-center gap-2 rounded bg-human-4 px-4 py-2 text-white hover:bg-human-4/80"
            >
              <span className="material-symbols-outlined text-base">
                download
              </span>
              Download Model
            </button>
          )}

          {status === 'ready' && (
            <>
              <button
                onClick={handleRedownloadModel}
                disabled={status !== 'ready'}
                className="flex items-center justify-center gap-2 rounded bg-background-2 px-4 py-2 hover:bg-background-3 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  refresh
                </span>
                Re-download
              </button>

              <button
                onClick={handleDeleteModel}
                disabled={isDeleting || status !== 'ready'}
                className="flex items-center justify-center gap-2 rounded bg-human-4 px-4 py-2 text-white hover:bg-human-4/80 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  delete
                </span>
                {isDeleting ? 'Deleting...' : 'Delete Model'}
              </button>
            </>
          )}
        </div>

        {!storageInfo?.supported && (
          <div className="rounded-lg bg-yellow-100 p-3 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <p className="text-sm">
              <span className="material-symbols-outlined mr-2 inline text-base">
                warning
              </span>
              IndexedDB storage is not supported in your browser. Model
              management features are unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
