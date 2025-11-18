// Note: This function should be called from server-side code
// import { createClient } from '@/lib/supabase/server'

export interface VideoMetadata {
  duration: number
  thumbnailUrl: string
  fileSize: number
  mimeType: string
}

export interface MediaVariants {
  original: string
  large?: string
  medium?: string
  thumbnail?: string
  webp?: {
    large?: string
    medium?: string
    thumbnail?: string
  }
}

/**
 * Generate thumbnail for video using canvas API
 * This is a client-side approach for basic thumbnail generation
 * For production, consider using FFmpeg or cloud services like Cloudinary
 */
export async function generateVideoThumbnail(
  videoFile: File,
  timeOffset: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    video.addEventListener('loadedmetadata', () => {
      // Set canvas size to video dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Seek to specified time
      video.currentTime = Math.min(timeOffset, video.duration - 0.1)
    })

    video.addEventListener('seeked', () => {
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            resolve(url)
          } else {
            reject(new Error('Failed to generate thumbnail'))
          }
        },
        'image/jpeg',
        0.8
      )
    })

    video.addEventListener('error', () => {
      reject(new Error('Video loading failed'))
    })

    video.src = URL.createObjectURL(videoFile)
    video.load()
  })
}

/**
 * Extract video duration and metadata
 */
export async function getVideoMetadata(videoFile: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(videoFile)

    video.addEventListener('loadedmetadata', () => {
      const duration = Math.round(video.duration)
      const fileSize = videoFile.size
      const mimeType = videoFile.type

      URL.revokeObjectURL(url)

      resolve({
        duration,
        thumbnailUrl: '', // Will be set after thumbnail generation
        fileSize,
        mimeType,
      })
    })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video metadata'))
    })

    video.src = url
    video.load()
  })
}

/**
 * Upload video thumbnail to Supabase Storage
 * Note: This function should be called from server-side code with a Supabase client
 */
export async function uploadVideoThumbnail(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>, // Supabase client passed from server-side
  thumbnailBlob: Blob,
  fileName: string
): Promise<string> {
  const fileExt = 'jpg'
  const filePath = `thumbnails/${fileName}.${fileExt}`

  const { data: _data, error } = await supabase.storage
    .from('theglocal-images')
    .upload(filePath, thumbnailBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload thumbnail: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('theglocal-images').getPublicUrl(filePath)

  return publicUrl
}

/**
 * Validate video file
 */
import { CONTENT_LIMITS } from '@/lib/utils/constants'

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

  if (file.size > CONTENT_LIMITS.VIDEO_MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video file too large. Maximum size is ${CONTENT_LIMITS.VIDEO_MAX_SIZE_MB}MB.`,
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported video format. Please use MP4, WebM, MOV, or AVI.' }
  }

  return { valid: true }
}

/**
 * Process video file and generate thumbnail
 */
export async function processVideoFile(
  videoFile: File,
  _fileName: string
): Promise<{
  metadata: VideoMetadata
  thumbnailUrl: string
}> {
  // Validate file
  const validation = validateVideoFile(videoFile)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Get video metadata
  const metadata = await getVideoMetadata(videoFile)

  // Generate thumbnail
  const thumbnailDataUrl = await generateVideoThumbnail(videoFile)

  // Convert data URL to blob
  const response = await fetch(thumbnailDataUrl)
  await response.blob()

  return {
    metadata,
    thumbnailUrl: thumbnailDataUrl,
  }
}
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}
