'use client'

import { logger } from '@/lib/utils/logger'
import { useRef, useCallback, useEffect, useReducer } from 'react'
import Image from 'next/image'
import { X, FileIcon, Paperclip, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MediaUploadGalleryProps, MediaUploadResult, MediaVariants } from '@/lib/types/api.types'
import { formatDuration } from '@/lib/utils/media/video-processing'
import { ChunkedUploader, UploadProgress, UploadResult } from '@/lib/utils/chunked-upload'
import { useToast } from '@/lib/hooks/use-toast'
import { formatFileSize } from '@/lib/utils/image-optimization'
import { CONTENT_LIMITS } from '@/lib/utils/constants'

// Helper function to detect file type by extension as fallback
function getFileTypeFromExtension(filename: string): 'image' | 'video' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']

  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  return 'unknown'
}

// Custom hook for file upload handling
// Store file reference for retry functionality
interface FileWithProgress extends UploadProgress {
  file?: File // Store original file for retry
}

// Upload state machine
interface UploadState {
  isUploading: boolean
  uploadProgress: FileWithProgress[]
  activeUploaders: Map<string, ChunkedUploader>
  fileStore: Map<string, File>
}

type UploadAction =
  | { type: 'START_UPLOAD'; files: File[] }
  | { type: 'ADD_UPLOADER'; uploadId: string; uploader: ChunkedUploader; file: File }
  | { type: 'UPDATE_PROGRESS'; uploadId: string; progress: UploadProgress }
  | { type: 'COMPLETE_UPLOAD'; uploadId: string }
  | { type: 'ERROR_UPLOAD'; uploadId: string; error: string }
  | { type: 'REMOVE_UPLOADER'; uploadId: string }
  | { type: 'CLEAR_PROGRESS'; uploadId: string }
  | { type: 'RETRY_UPLOAD'; uploadId: string; file: File }
  | { type: 'RESET' }

const initialState: UploadState = {
  isUploading: false,
  uploadProgress: [],
  activeUploaders: new Map(),
  fileStore: new Map(),
}

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'START_UPLOAD':
      return {
        ...state,
        isUploading: true,
      }

    case 'ADD_UPLOADER': {
      const newUploaders = new Map(state.activeUploaders)
      newUploaders.set(action.uploadId, action.uploader)

      const newFileStore = new Map(state.fileStore)
      newFileStore.set(action.uploadId, action.file)

      const initialProgress: FileWithProgress = {
        fileId: action.uploadId,
        fileName: action.file.name,
        loaded: 0,
        total: action.file.size,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        status: 'preparing',
        file: action.file,
      }

      return {
        ...state,
        activeUploaders: newUploaders,
        fileStore: newFileStore,
        uploadProgress: [...state.uploadProgress, initialProgress],
      }
    }

    case 'UPDATE_PROGRESS': {
      // Only update existing progress items - never create new ones
      // Progress items must be created via ADD_UPLOADER first
      const existingIndex = state.uploadProgress.findIndex((p) => p.fileId === action.uploadId)

      if (existingIndex === -1) {
        // Progress item doesn't exist yet - ignore this update
        // It will be created by ADD_UPLOADER, and subsequent updates will work
        return state
      }

      const updatedProgress = [...state.uploadProgress]
      updatedProgress[existingIndex] = { ...updatedProgress[existingIndex], ...action.progress }

      return {
        ...state,
        uploadProgress: updatedProgress,
      }
    }

    case 'COMPLETE_UPLOAD': {
      const newUploaders = new Map(state.activeUploaders)
      newUploaders.delete(action.uploadId)

      // Remove progress after delay (handled in effect)
      return {
        ...state,
        activeUploaders: newUploaders,
      }
    }

    case 'ERROR_UPLOAD': {
      const existingIndex = state.uploadProgress.findIndex((p) => p.fileId === action.uploadId)

      let updatedProgress: FileWithProgress[]
      if (existingIndex === -1) {
        // For error cases that happen before ADD_UPLOADER, create the progress item here
        // This should only happen for validation errors
        const errorProgress: FileWithProgress = {
          fileId: action.uploadId,
          fileName: action.uploadId, // Will be updated by UPDATE_PROGRESS if needed
          loaded: 0,
          total: 0,
          percentage: 0,
          speed: 0,
          estimatedTimeRemaining: 0,
          status: 'error',
          error: action.error,
        }
        updatedProgress = [...state.uploadProgress, errorProgress]
      } else {
        updatedProgress = state.uploadProgress.map((p) =>
          p.fileId === action.uploadId ? { ...p, status: 'error' as const, error: action.error } : p
        )
      }

      const newUploaders = new Map(state.activeUploaders)
      newUploaders.delete(action.uploadId)

      return {
        ...state,
        uploadProgress: updatedProgress,
        activeUploaders: newUploaders,
      }
    }

    case 'REMOVE_UPLOADER': {
      const newUploaders = new Map(state.activeUploaders)
      newUploaders.delete(action.uploadId)

      return {
        ...state,
        activeUploaders: newUploaders,
      }
    }

    case 'CLEAR_PROGRESS': {
      const filteredProgress = state.uploadProgress.filter((p) => p.fileId !== action.uploadId)

      // Check if we should clear isUploading
      const allComplete =
        state.activeUploaders.size === 0 &&
        filteredProgress.every(
          (p) => p.status === 'completed' || p.status === 'error' || p.status === 'cancelled'
        )

      return {
        ...state,
        uploadProgress: filteredProgress,
        isUploading: allComplete ? false : state.isUploading,
      }
    }

    case 'RETRY_UPLOAD': {
      const filteredProgress = state.uploadProgress.filter((p) => p.fileId !== action.uploadId)

      return {
        ...state,
        uploadProgress: filteredProgress,
      }
    }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// Helper function to derive isUploading from state
function deriveIsUploading(state: UploadState): boolean {
  if (state.activeUploaders.size > 0) {
    return true
  }

  const hasActiveProgress = state.uploadProgress.some(
    (p) => p.status !== 'completed' && p.status !== 'error' && p.status !== 'cancelled'
  )

  return hasActiveProgress
}

export function useFileUpload(
  onMediaSelect: (items: MediaUploadResult[]) => void,
  currentMedia: MediaUploadResult[],
  maxItems: number,
  disabled: boolean,
  folder: string = 'media'
) {
  const [state, dispatch] = useReducer(uploadReducer, initialState)
  const { toast } = useToast()

  // Derive isUploading from state
  const isUploading = deriveIsUploading(state)

  // Auto-clear progress items after completion
  useEffect(() => {
    const completedIds = state.uploadProgress
      .filter((p) => p.status === 'completed')
      .map((p) => p.fileId)

    if (completedIds.length > 0) {
      // Clear completed progress after delay
      const timers = completedIds.map((id) =>
        setTimeout(() => {
          dispatch({ type: 'CLEAR_PROGRESS', uploadId: id })
        }, 2000)
      )

      return () => {
        timers.forEach((timer) => clearTimeout(timer))
      }
    }
  }, [state.uploadProgress])

  // Update isUploading when state changes
  useEffect(() => {
    const shouldBeUploading = deriveIsUploading(state)
    if (state.isUploading !== shouldBeUploading) {
      // This is handled automatically by the reducer in CLEAR_PROGRESS
      // But we can dispatch RESET if needed
    }
  }, [state])

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (disabled || isUploading) return

      const fileArray = Array.from(files)
      const remainingSlots = maxItems - currentMedia.length
      const filesToProcess = fileArray.slice(0, remainingSlots)

      if (filesToProcess.length === 0) {
        return
      }

      logger.info(`🚀 Starting chunked upload for ${filesToProcess.length} files`)

      dispatch({ type: 'START_UPLOAD', files: filesToProcess })

      // Start chunked upload for each file
      for (const file of filesToProcess) {
        // Validate file - use both MIME type and extension as fallback
        const isImage =
          file.type.startsWith('image/') || getFileTypeFromExtension(file.name) === 'image'
        const isVideo =
          file.type.startsWith('video/') || getFileTypeFromExtension(file.name) === 'video'
        const maxSize = isVideo
          ? CONTENT_LIMITS.VIDEO_MAX_SIZE_BYTES
          : CONTENT_LIMITS.IMAGE_MAX_SIZE_BYTES

        if (!isImage && !isVideo) {
          const fileId = `error-${Date.now()}-${Math.random()}`
          // Dispatch error directly to state
          dispatch({
            type: 'ERROR_UPLOAD',
            uploadId: fileId,
            error:
              'Unsupported file type. Supported: images (jpg, png, gif, webp) and videos (mp4, webm, ogg, mov)',
          })
          // Add error progress manually for display
          const errorProgress: UploadProgress = {
            fileId,
            fileName: file.name,
            loaded: 0,
            total: file.size,
            percentage: 0,
            speed: 0,
            estimatedTimeRemaining: 0,
            status: 'error',
            error:
              'Unsupported file type. Supported: images (jpg, png, gif, webp) and videos (mp4, webm, ogg, mov)',
          }
          dispatch({ type: 'UPDATE_PROGRESS', uploadId: fileId, progress: errorProgress })
          continue
        }

        if (file.size > maxSize) {
          const fileId = `error-${Date.now()}-${Math.random()}`
          const errorMessage = `File too large (max ${isVideo ? `${CONTENT_LIMITS.VIDEO_MAX_SIZE_MB}MB` : `${CONTENT_LIMITS.IMAGE_MAX_SIZE_MB}MB`})`
          // Dispatch error directly to state
          dispatch({
            type: 'ERROR_UPLOAD',
            uploadId: fileId,
            error: errorMessage,
          })
          // Add error progress manually for display
          const errorProgress: UploadProgress = {
            fileId,
            fileName: file.name,
            loaded: 0,
            total: file.size,
            percentage: 0,
            speed: 0,
            estimatedTimeRemaining: 0,
            status: 'error',
            error: errorMessage,
          }
          dispatch({ type: 'UPDATE_PROGRESS', uploadId: fileId, progress: errorProgress })
          continue
        }

        // Create chunked uploader with proper callbacks
        const uploader = new ChunkedUploader(file, {
          chunkSize: 1024 * 1024, // 1MB chunks
          maxRetries: 3,
          folder: folder, // Use the folder parameter
          onProgress: (progress: UploadProgress) => {
            // Use the uploader's generated ID from the progress object
            dispatch({ type: 'UPDATE_PROGRESS', uploadId: progress.fileId, progress })
          },
          onChunkComplete: (chunkIndex: number, totalChunks: number) => {
            logger.info(`📦 Chunk ${chunkIndex + 1}/${totalChunks} completed for ${file.name}`)
          },
          onComplete: (result: UploadResult) => {
            logger.info(`✅ Upload completed for ${file.name}:`, result)

            // Convert to MediaUploadResult format
            const mediaResult: MediaUploadResult = {
              id: result.id,
              url: result.url,
              variants: result.variants as unknown as MediaVariants,
              mediaType: result.mediaType,
              duration: result.duration,
              thumbnailUrl: result.thumbnailUrl,
              fileSize: result.fileSize,
              mimeType: result.mimeType,
              altText: result.altText || undefined,
            }

            // Add to current media
            const newMedia = [...currentMedia, mediaResult]
            onMediaSelect(newMedia)

            // Use the uploader's actual ID from getUploadId()
            const actualUploadId = uploader.getUploadId()
            dispatch({ type: 'COMPLETE_UPLOAD', uploadId: actualUploadId })
          },
          onError: (error: Error) => {
            logger.error(`❌ Upload failed for ${file.name}:`, error)
            toast({
              title: 'Upload failed',
              description: error.message || 'Could not upload file',
              variant: 'destructive',
            })

            // Use the uploader's actual ID from getUploadId()
            const actualUploadId = uploader.getUploadId()
            dispatch({ type: 'ERROR_UPLOAD', uploadId: actualUploadId, error: error.message })
          },
        })

        // Get the actual uploadId that the uploader generated
        const actualUploadId = uploader.getUploadId()

        // Dispatch ADD_UPLOADER before starting upload to prevent race condition
        dispatch({ type: 'ADD_UPLOADER', uploadId: actualUploadId, uploader, file })

        // Start the upload after progress item is created
        uploader.start()
      }
    },
    [currentMedia, maxItems, onMediaSelect, disabled, isUploading, toast, folder]
  )

  // Retry failed upload
  const retryUpload = useCallback(
    (fileId: string) => {
      const progressItem = state.uploadProgress.find((p) => p.fileId === fileId)
      if (!progressItem || progressItem.status !== 'error') {
        return
      }

      const file = progressItem.file || state.fileStore.get(fileId)
      if (!file) {
        toast({
          title: 'Cannot retry',
          description: 'File reference lost. Please select the file again.',
          variant: 'destructive',
        })
        return
      }

      // Remove the error progress item
      dispatch({ type: 'RETRY_UPLOAD', uploadId: fileId, file })

      // Create a FileList-like object for retry
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)

      // Use setTimeout to allow state update to complete
      setTimeout(() => {
        handleFileSelect(dataTransfer.files)
      }, 0)
    },
    [state.uploadProgress, state.fileStore, handleFileSelect, toast]
  )

  return {
    handleFileSelect,
    isUploading,
    uploadProgress: state.uploadProgress,
    retryUpload,
  }
}

// Helper to get status badge info
const getStatusBadge = (status: UploadProgress['status']) => {
  switch (status) {
    case 'preparing':
      return {
        label: 'Preparing...',
        icon: Loader2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      }
    case 'uploading':
      return {
        label: 'Uploading...',
        icon: Loader2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      }
    case 'processing':
      return {
        label: 'Processing...',
        icon: Loader2,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      }
    case 'completed':
      return {
        label: 'Complete',
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      }
    case 'error':
      return {
        label: 'Failed',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
      }
    default:
      return {
        label: 'Unknown',
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
      }
  }
}

export function MediaUploadGallery({
  onMediaRemove,
  currentMedia,
  uploadProgress = [],
  onRetryUpload,
}: MediaUploadGalleryProps & { onRetryUpload?: (fileId: string) => void }) {
  return (
    <div className="space-y-4">
      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-3">
          {(uploadProgress as UploadProgress[]).map((progress) => {
            const statusBadge = getStatusBadge(progress.status)
            const Icon = statusBadge.icon
            const isCompleted = progress.status === 'completed'
            const isError = progress.status === 'error'

            return (
              <div key={progress.fileId} className="space-y-2 p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="truncate font-medium">{progress.fileName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">
                          {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
                        </span>
                        <span className="text-xs">({progress.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${statusBadge.bgColor}`}
                    >
                      <Icon
                        className={`h-3 w-3 ${statusBadge.color} ${progress.status === 'preparing' || progress.status === 'uploading' || progress.status === 'processing' ? 'animate-spin' : ''}`}
                      />
                      <span className={statusBadge.color}>{statusBadge.label}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar with conditional styling */}
                <div
                  className={`relative h-2 w-full overflow-hidden rounded-full ${isCompleted ? 'bg-green-100' : isError ? 'bg-red-100' : 'bg-gray-200'}`}
                >
                  <div
                    className={`h-full w-full flex-1 transition-all ${isCompleted ? 'bg-green-600' : isError ? 'bg-red-600' : 'bg-blue-600'}`}
                    style={{ transform: `translateX(-${100 - progress.percentage}%)` }}
                  />
                </div>

                {progress.status === 'error' && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-destructive text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>{progress.error}</span>
                    </div>
                    {onRetryUpload && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetryUpload(progress.fileId)}
                        className="h-7 text-xs"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Media Display Grid - only show if there are media items */}
      {currentMedia.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {currentMedia.map((item) => (
            <div key={item.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                {item.mediaType === 'image' ? (
                  <Image
                    src={item.url}
                    alt={item.altText || 'Uploaded image'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 200px"
                    loading="lazy"
                    quality={85}
                  />
                ) : item.mediaType === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" controls />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onMediaRemove(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>

              {item.mediaType === 'video' && item.duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
                  {formatDuration(item.duration)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Attachment Button Component - separate trigger for file uploads
interface AttachmentButtonProps {
  onFileSelect: (files: FileList) => void
  currentMediaCount: number
  maxItems: number
  disabled?: boolean
}

export function AttachmentButton({
  onFileSelect,
  currentMediaCount,
  maxItems,
  disabled = false,
}: AttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFileSelect(files)
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [onFileSelect]
  )

  const canAddMore = currentMediaCount < maxItems

  return (
    <>
      <label className="sr-only">
        Upload attachments
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload attachments"
          title="Upload attachments"
          id="attachment-input"
          placeholder="Upload attachments"
        />
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || !canAddMore}
        className="relative"
      >
        <Paperclip className="h-4 w-4" />
        {currentMediaCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            {currentMediaCount}
          </span>
        )}
      </Button>
    </>
  )
}
