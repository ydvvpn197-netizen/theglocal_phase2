import { useState, useCallback } from 'react'
import {
  uploadVideoWithChunking,
  createVideoThumbnail,
  uploadThumbnail,
} from '@/lib/utils/media/video-upload'

export interface VideoUploadState {
  isUploading: boolean
  progress: number
  error: string | null
  url: string | null
  thumbnail: string | null
}

export interface VideoUploadOptions {
  folder?: string
  onSuccess?: (url: string, thumbnail?: string) => void
  onError?: (error: string) => void
}

export function useVideoUpload(options: VideoUploadOptions = {}) {
  const [state, setState] = useState<VideoUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    url: null,
    thumbnail: null,
  })

  const upload = useCallback(
    async (file: File) => {
      if (!file) {
        setState((prev) => ({ ...prev, error: 'No file provided' }))
        return
      }

      // Validate file type
      const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/avi',
        'video/mov',
        'video/quicktime',
      ]
      if (!allowedTypes.includes(file.type)) {
        setState((prev) => ({
          ...prev,
          error: 'Invalid file type. Please select a video file.',
        }))
        return
      }

      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        setState((prev) => ({
          ...prev,
          error: 'File too large. Maximum size is 100MB.',
        }))
        return
      }

      setState({
        isUploading: true,
        progress: 0,
        error: null,
        url: null,
        thumbnail: null,
      })

      try {
        // Create thumbnail first
        const thumbnailDataUrl = await createVideoThumbnail(file)

        // Upload video
        const result = await uploadVideoWithChunking({
          file,
          folder: options.folder || 'videos',
          onProgress: (progress) => {
            setState((prev) => ({ ...prev, progress }))
          },
          onComplete: async (url, path) => {
            let thumbnailUrl = null

            // Upload thumbnail if we have one
            if (thumbnailDataUrl) {
              thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, path)
            }

            setState((prev) => ({
              ...prev,
              isUploading: false,
              progress: 100,
              url,
              thumbnail: thumbnailUrl,
            }))

            options.onSuccess?.(url, thumbnailUrl || undefined)
          },
          onError: (error) => {
            setState((prev) => ({
              ...prev,
              isUploading: false,
              error,
            }))
            options.onError?.(error)
          },
        })

        if (!result.success) {
          setState((prev) => ({
            ...prev,
            isUploading: false,
            error: result.error || 'Upload failed',
          }))
          options.onError?.(result.error || 'Upload failed')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: errorMessage,
        }))
        options.onError?.(errorMessage)
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      url: null,
      thumbnail: null,
    })
  }, [])

  return {
    ...state,
    upload,
    reset,
  }
}
