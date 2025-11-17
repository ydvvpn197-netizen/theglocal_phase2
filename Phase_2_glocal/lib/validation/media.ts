import { CONTENT_LIMITS } from '@/lib/utils/constants'
import { validateUrl } from './common'

export interface MediaItem {
  id: string
  url: string
  mediaType?: string
  media_type?: string
  [key: string]: unknown
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (!imageTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid image format' }
  }

  return validateFile(file)
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov']

  if (!videoTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid video format' }
  }

  if (file.size > CONTENT_LIMITS.VIDEO_MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video file too large (max ${CONTENT_LIMITS.VIDEO_MAX_SIZE_MB}MB)`,
    }
  }

  return validateFile(file)
}

export function validateFile(file: File | null | undefined): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  if (!(file instanceof File)) {
    return { valid: false, error: 'Invalid file object' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Empty file not allowed' }
  }

  if (file.size > CONTENT_LIMITS.VIDEO_MAX_SIZE_BYTES) {
    return { valid: false, error: `File too large (max ${CONTENT_LIMITS.VIDEO_MAX_SIZE_MB}MB)` }
  }

  return { valid: true }
}

export function validateMediaItem(item: unknown): {
  valid: boolean
  item?: MediaItem
  error?: string
} {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Invalid media item object' }
  }

  const mediaItem = item as Record<string, unknown>

  if (!mediaItem.id || typeof mediaItem.id !== 'string') {
    return { valid: false, error: 'Media item missing valid ID' }
  }

  if (!mediaItem.url || typeof mediaItem.url !== 'string') {
    return { valid: false, error: 'Media item missing valid URL' }
  }

  const urlValidation = validateUrl(mediaItem.url)
  if (!urlValidation.valid) {
    return { valid: false, error: `Invalid media URL: ${urlValidation.error}` }
  }

  return {
    valid: true,
    item: mediaItem as MediaItem,
  }
}
