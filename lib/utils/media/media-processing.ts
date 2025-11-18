import { toast } from '@/lib/hooks/use-toast'
import { compressImage, formatFileSize } from '@/lib/utils/image-optimization'
import {
  generateVideoThumbnail,
  getVideoDuration,
  getVideoMetadata,
} from '@/lib/utils/media/video-utils'
import { validateVideoFile } from '@/lib/utils/validation'

export interface MediaData {
  type: 'image' | 'gif' | 'video'
  file?: File
  previewUrl: string
  isExternal: boolean // True for Giphy GIFs
  originalSize?: number
  compressedSize?: number
  duration?: number // For videos
  aspectRatio?: number // For videos
  thumbnail?: string // For videos
}

export async function processImageFile(file: File): Promise<MediaData> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file')
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Image must be less than 10MB')
  }

  const originalSize = file.size

  try {
    // Compress image on client side
    const compressedFile = await compressImage(file)
    const previewUrl = URL.createObjectURL(compressedFile)

    if (compressedFile.size < originalSize) {
      const savings = (((originalSize - compressedFile.size) / originalSize) * 100).toFixed(0)
      toast({
        title: 'Image Optimized',
        description: `Reduced by ${savings}% (${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)})`,
      })
    }

    return {
      type: 'image',
      file: compressedFile,
      previewUrl,
      isExternal: false,
      originalSize,
      compressedSize: compressedFile.size,
    }
  } catch {
    throw new Error('Failed to process image')
  }
}

export async function processVideoFile(file: File): Promise<MediaData> {
  // Validate video file
  const validation = validateVideoFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    // Generate thumbnail and get metadata
    const [thumbnail, duration, metadata] = await Promise.all([
      generateVideoThumbnail(file),
      getVideoDuration(file),
      getVideoMetadata(file),
    ])

    const previewUrl = URL.createObjectURL(file)

    return {
      type: 'video',
      file,
      previewUrl,
      isExternal: false,
      originalSize: file.size,
      thumbnail,
      duration,
      aspectRatio: metadata.aspectRatio,
    }
  } catch {
    throw new Error('Failed to process video')
  }
}

export function processGifFile(file: File): MediaData {
  // Validate file size (10MB max for GIFs)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('GIF must be less than 10MB')
  }

  const previewUrl = URL.createObjectURL(file)
  return {
    type: 'gif',
    file,
    previewUrl,
    isExternal: false,
  }
}

export function processExternalGif(gifUrl: string): MediaData {
  return {
    type: 'gif',
    previewUrl: gifUrl,
    isExternal: true,
  }
}

export function cleanupMediaData(mediaData: MediaData | null) {
  if (mediaData && !mediaData.isExternal && mediaData.previewUrl) {
    URL.revokeObjectURL(mediaData.previewUrl)
  }
}
