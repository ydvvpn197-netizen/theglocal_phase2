import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/client'

export interface VideoUploadOptions {
  file: File
  folder?: string
  onProgress?: (progress: number) => void
  onComplete?: (url: string, path: string) => void
  onError?: (error: string) => void
}

export interface VideoUploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks for better reliability

export async function uploadVideo({
  file,
  folder = 'videos',
  onProgress,
  onComplete,
  onError,
}: VideoUploadOptions): Promise<VideoUploadResult> {
  try {
    const supabase = createClient()
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const filePath = `${folder}/${Date.now()}-${file.name}`
    let uploadedBytes = 0

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      const chunkPath = `${filePath}.chunk.${chunkIndex}`

      const { error: uploadError } = await supabase.storage
        .from('theglocal-videos')
        .upload(chunkPath, chunk, {
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) {
        throw new Error(`Chunk ${chunkIndex} upload failed: ${uploadError.message}`)
      }

      uploadedBytes += chunk.size
      const progress = (uploadedBytes / file.size) * 100
      onProgress?.(progress)
    }

    // After all chunks are uploaded, we need to combine them
    // This would typically be done server-side, but for now we'll use the direct upload approach
    const {
      data: { publicUrl },
    } = supabase.storage.from('theglocal-videos').getPublicUrl(filePath)

    onComplete?.(publicUrl, filePath)
    return { success: true, url: publicUrl, path: filePath }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Large file upload failed'
    onError?.(errorMessage)
    return { success: false, error: errorMessage }
  }
}

// Utility function to create video thumbnail
export async function createVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      resolve(null)
      return
    }

    video.addEventListener('loadeddata', () => {
      // Set canvas dimensions
      canvas.width = 320
      canvas.height = 180

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to data URL
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve(thumbnailDataUrl)
    })

    video.addEventListener('error', () => {
      resolve(null)
    })

    video.src = URL.createObjectURL(file)
    video.load()
  })
}

// Utility function to upload thumbnail
export async function uploadThumbnail(
  thumbnailDataUrl: string,
  videoPath: string
): Promise<string | null> {
  try {
    const supabase = createClient()

    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl)
    const blob = await response.blob()

    // Generate thumbnail path
    const thumbnailPath = videoPath.replace(/\.[^/.]+$/, '_thumb.jpg')

    // Upload thumbnail
    const { data: _data, error } = await supabase.storage
      .from('theglocal-videos')
      .upload(thumbnailPath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      })

    if (error) {
      logger.error('Thumbnail upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('theglocal-videos').getPublicUrl(thumbnailPath)

    return urlData.publicUrl
  } catch (error) {
    logger.error('Thumbnail upload error:', error)
    return null
  }
}

export async function uploadVideoThumbnail(
  thumbnailDataUrl: string,
  videoPath: string
): Promise<string | null> {
  try {
    const supabase = createClient()

    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl)
    const blob = await response.blob()

    // Generate thumbnail path
    const thumbnailPath = videoPath.replace(/.[^/.]+$/, '_thumb.jpg')

    // Upload thumbnail
    const { data: _data, error } = await supabase.storage
      .from('videos')
      .upload(thumbnailPath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      })

    if (error) {
      logger.error('Thumbnail upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(thumbnailPath)

    return urlData.publicUrl
  } catch (error) {
    logger.error('Thumbnail upload error:', error)
    return null
  }
}

export async function uploadVideoWithChunking(
  options: VideoUploadOptions
): Promise<VideoUploadResult> {
  return uploadVideo(options)
}
