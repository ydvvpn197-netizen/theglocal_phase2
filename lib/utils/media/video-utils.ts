/**
 * Video Utilities
 * Client-side video processing and metadata extraction
 */

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  aspectRatio: number
}

/**
 * Generate a thumbnail from video file by capturing a frame
 * @param file Video file
 * @returns Data URL of the thumbnail image
 */
export async function generateVideoThumbnail(file: File): Promise<string> {
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

      // Seek to 1 second or 10% of duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1)
    })

    video.addEventListener('seeked', () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(thumbnailUrl)
      } catch (error) {
        reject(error)
      }
    })

    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${e}`))
    })

    video.src = URL.createObjectURL(file)
    video.load()
  })
}

/**
 * Get video duration in seconds
 * @param file Video file
 * @returns Duration in seconds
 */
export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')

    video.addEventListener('loadedmetadata', () => {
      resolve(video.duration)
    })

    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${e}`))
    })

    video.src = URL.createObjectURL(file)
    video.load()
  })
}

/**
 * Get comprehensive video metadata
 * @param file Video file
 * @returns Video metadata including dimensions and aspect ratio
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')

    video.addEventListener('loadedmetadata', () => {
      const aspectRatio = video.videoWidth / video.videoHeight
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio,
      })
    })

    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${e}`))
    })

    video.src = URL.createObjectURL(file)
    video.load()
  })
}

/**
 * Format video duration as MM:SS or HH:MM:SS
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatVideoDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Check if a file is a supported video format
 * @param file File to check
 * @returns True if file is a supported video format
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

/**
 * Get file extension from MIME type
 * @param mimeType MIME type string
 * @returns File extension without dot
 */
export function getVideoExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  }

  return mimeToExt[mimeType] || 'mp4'
}
