/**
 * Unified Server-Side Media Processing
 *
 * Consolidates image processing functionality from server-image-processing.ts
 * and server-media-processing.ts into a single, cohesive module.
 *
 * This file handles:
 * - Image processing from Buffer (returns buffers)
 * - Image processing from File (uploads to Supabase)
 * - Shared constants and types
 */

import { logger } from '@/lib/utils/logger'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'

// ============================================================================
// Shared Constants
// ============================================================================

export const IMAGE_SIZES = {
  THUMBNAIL: 256,
  MEDIUM: 640,
  LARGE: 1200,
} as const

export const IMAGE_QUALITY = {
  webp: 85,
  jpeg: 85,
  png: 90,
} as const

const IMAGE_SIZES_WITH_HEIGHT = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 400, height: 400 },
  medium: { width: 800, height: 600 },
  large: { width: 1200, height: 900 },
  original: { maxWidth: 2048, maxHeight: 2048 },
} as const

// ============================================================================
// Types
// ============================================================================

export interface ImageVariant {
  buffer: Buffer
  filename: string
  width: number
  format: 'jpeg' | 'webp' | 'png' | 'gif'
}

export interface MediaVariants {
  original: string
  large: string
  medium: string
  thumbnail: string
  webp: {
    large: string
    medium: string
    thumbnail: string
  }
}

export interface ProcessedImageVariants {
  original: string
  large: string
  medium: string
  small: string
  thumbnail: string
  webp: {
    large: string
    medium: string
    small: string
    thumbnail: string
  }
}

export interface ProcessedVideoResult {
  url: string
  thumbnailUrl: string
  duration: number
  variants: {
    original: string
    thumbnail: string
  }
}

export interface MediaProcessingResult {
  id: string
  mediaType: 'image' | 'video' | 'gif'
  url: string
  variants: ProcessedImageVariants | ProcessedVideoResult['variants']
  fileSize: number
  mimeType: string
  duration?: number
  thumbnailUrl?: string
  width?: number
  height?: number
  altText: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper function to detect file type by extension as fallback
 */
function getFileTypeFromExtension(filename: string): 'image' | 'video' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']

  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  return 'unknown'
}

/**
 * Determine if a file is a GIF based on buffer
 */
export async function isGifBuffer(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata()
    return metadata.format === 'gif'
  } catch {
    return false
  }
}

// ============================================================================
// Buffer-based Processing (returns buffers, no upload)
// ============================================================================

/**
 * Process an image from Buffer and generate multiple sizes and formats
 * Returns buffers that can be used directly (e.g., for testing or custom upload logic)
 */
export async function processImageBuffer(
  buffer: Buffer,
  originalFilename: string
): Promise<ImageVariant[]> {
  const variants: ImageVariant[] = []
  const baseFilename = originalFilename.replace(/\.[^/.]+$/, '')

  try {
    const image = sharp(buffer)
    const metadata = await image.metadata()

    // Determine if we should preserve transparency
    const hasAlpha = metadata.hasAlpha
    const format = hasAlpha ? 'png' : 'jpeg'

    // Original size (optimized)
    const originalBuffer = await sharp(buffer)
      .resize({ width: IMAGE_SIZES.LARGE, withoutEnlargement: true })
      [format]({ quality: format === 'png' ? IMAGE_QUALITY.png : IMAGE_QUALITY.jpeg })
      .toBuffer()

    variants.push({
      buffer: originalBuffer,
      filename: `${baseFilename}-original.${format}`,
      width: IMAGE_SIZES.LARGE,
      format,
    })

    // Large size
    const largeBuffer = await sharp(buffer)
      .resize({ width: IMAGE_SIZES.LARGE, withoutEnlargement: true })
      [format]({ quality: format === 'png' ? IMAGE_QUALITY.png : IMAGE_QUALITY.jpeg })
      .toBuffer()

    variants.push({
      buffer: largeBuffer,
      filename: `${baseFilename}-large.${format}`,
      width: IMAGE_SIZES.LARGE,
      format,
    })

    // Medium size
    const mediumBuffer = await sharp(buffer)
      .resize({ width: IMAGE_SIZES.MEDIUM, withoutEnlargement: true })
      [format]({ quality: format === 'png' ? IMAGE_QUALITY.png : IMAGE_QUALITY.jpeg })
      .toBuffer()

    variants.push({
      buffer: mediumBuffer,
      filename: `${baseFilename}-medium.${format}`,
      width: IMAGE_SIZES.MEDIUM,
      format,
    })

    // Thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize({ width: IMAGE_SIZES.THUMBNAIL, withoutEnlargement: true })
      [format]({ quality: format === 'png' ? IMAGE_QUALITY.png : IMAGE_QUALITY.jpeg })
      .toBuffer()

    variants.push({
      buffer: thumbnailBuffer,
      filename: `${baseFilename}-thumbnail.${format}`,
      width: IMAGE_SIZES.THUMBNAIL,
      format,
    })

    // WebP versions (better compression, modern browsers)
    const largeWebpBuffer = await sharp(buffer)
      .resize({ width: IMAGE_SIZES.LARGE, withoutEnlargement: true })
      .webp({ quality: IMAGE_QUALITY.webp })
      .toBuffer()

    variants.push({
      buffer: largeWebpBuffer,
      filename: `${baseFilename}-large.webp`,
      width: IMAGE_SIZES.LARGE,
      format: 'webp',
    })

    const mediumWebpBuffer = await sharp(buffer)
      .resize({ width: IMAGE_SIZES.MEDIUM, withoutEnlargement: true })
      .webp({ quality: IMAGE_QUALITY.webp })
      .toBuffer()

    variants.push({
      buffer: mediumWebpBuffer,
      filename: `${baseFilename}-medium.webp`,
      width: IMAGE_SIZES.MEDIUM,
      format: 'webp',
    })

    const thumbnailWebpBuffer = await sharp(buffer)
      .resize({ width: IMAGE_SIZES.THUMBNAIL, withoutEnlargement: true })
      .webp({ quality: IMAGE_QUALITY.webp })
      .toBuffer()

    variants.push({
      buffer: thumbnailWebpBuffer,
      filename: `${baseFilename}-thumbnail.webp`,
      width: IMAGE_SIZES.THUMBNAIL,
      format: 'webp',
    })

    return variants
  } catch (error) {
    logger.error('Image processing error:', error)
    throw new Error('Failed to process image')
  }
}

/**
 * Process a GIF file (optimize without breaking animation)
 */
export async function processGifBuffer(
  buffer: Buffer,
  originalFilename: string
): Promise<ImageVariant> {
  try {
    // For GIFs, we just optimize without resizing to preserve animation
    const optimizedBuffer = await sharp(buffer, { animated: true }).gif().toBuffer()

    return {
      buffer: optimizedBuffer,
      filename: originalFilename,
      width: 0, // Width not relevant for GIFs
      format: 'gif',
    }
  } catch (error) {
    logger.error('GIF processing error:', error)
    // Return original if processing fails
    return {
      buffer,
      filename: originalFilename,
      width: 0,
      format: 'gif',
    }
  }
}

// ============================================================================
// File-based Processing (uploads to Supabase)
// ============================================================================

/**
 * Process image file and upload variants to Supabase Storage
 * Returns URLs for all generated variants
 */
export async function processImageForUpload(
  file: File,
  folder: string = 'media'
): Promise<MediaProcessingResult> {
  const supabase = await createClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    // Process the image with Sharp
    const image = sharp(buffer)
    const metadata = await image.metadata()

    // Generate variants
    const variants: ProcessedImageVariants = {
      original: '',
      large: '',
      medium: '',
      small: '',
      thumbnail: '',
      webp: {
        large: '',
        medium: '',
        small: '',
        thumbnail: '',
      },
    }

    // Upload original
    const originalPath = `${folder}/${Date.now()}-${file.name}`
    const { data: _originalData, error: originalError } = await supabase.storage
      .from('theglocal-uploads')
      .upload(originalPath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (originalError) throw originalError

    const { data: originalUrl } = supabase.storage
      .from('theglocal-uploads')
      .getPublicUrl(originalPath)

    variants.original = originalUrl.publicUrl

    // Generate and upload variants
    for (const [sizeName, size] of Object.entries(IMAGE_SIZES_WITH_HEIGHT)) {
      if (sizeName === 'original') continue

      // Check if size has width and height properties
      if (!('width' in size) || !('height' in size)) continue

      const resizedBuffer = await image
        .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: IMAGE_QUALITY.jpeg })
        .toBuffer()

      const variantPath = `${folder}/${Date.now()}-${sizeName}-${file.name.replace(/\.[^/.]+$/, '.jpg')}`
      const { error: variantError } = await supabase.storage
        .from('theglocal-uploads')
        .upload(variantPath, resizedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        })

      if (!variantError) {
        const { data: variantUrl } = supabase.storage
          .from('theglocal-uploads')
          .getPublicUrl(variantPath)

        variants[sizeName as keyof Omit<ProcessedImageVariants, 'webp'>] = variantUrl.publicUrl
      }
    }

    return {
      id: originalPath,
      mediaType: 'image',
      url: variants.original,
      variants,
      fileSize: file.size,
      mimeType: file.type,
      width: metadata.width,
      height: metadata.height,
      altText: file.name,
    }
  } catch (error) {
    logger.error('Image processing error:', error)
    throw error
  }
}

/**
 * Process video file and upload to Supabase Storage
 */
async function processVideoForUpload(
  file: File,
  folder: string = 'media'
): Promise<MediaProcessingResult> {
  // Basic video processing - just upload the file
  const supabase = await createClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const filePath = `${folder}/${Date.now()}-${file.name}`
  const { data: _data, error } = await supabase.storage
    .from('theglocal-uploads')
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
    })

  if (error) throw error

  const { data: urlData } = supabase.storage.from('theglocal-uploads').getPublicUrl(filePath)

  return {
    id: filePath,
    mediaType: 'video',
    url: urlData.publicUrl,
    variants: {
      original: urlData.publicUrl,
      thumbnail: urlData.publicUrl,
    },
    fileSize: file.size,
    mimeType: file.type,
    altText: file.name,
  }
}

/**
 * Process media file (image or video) and upload to Supabase
 */
export async function processMediaFile(
  file: File,
  folder: string = 'media'
): Promise<MediaProcessingResult> {
  // Validate file - use both MIME type and extension as fallback
  const isImage = file.type.startsWith('image/') || getFileTypeFromExtension(file.name) === 'image'
  const isVideo = file.type.startsWith('video/') || getFileTypeFromExtension(file.name) === 'video'

  if (isImage) {
    return processImageForUpload(file, folder)
  } else if (isVideo) {
    return processVideoForUpload(file, folder)
  } else {
    throw new Error(
      'Unsupported file type. Supported: images (jpg, png, gif, webp) and videos (mp4, webm, ogg, mov)'
    )
  }
}

/**
 * Process multiple media files and upload to Supabase
 */
export async function processMediaFiles(
  files: File[],
  folder: string = 'media'
): Promise<{
  results: MediaProcessingResult[]
  errors: Array<{ fileName: string; error: string }>
}> {
  const results: MediaProcessingResult[] = []
  const errors: Array<{ fileName: string; error: string }> = []

  for (const file of files) {
    try {
      const result = await processMediaFile(file, folder)
      results.push(result)
    } catch (error) {
      errors.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { results, errors }
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * Alias for processImageBuffer for backward compatibility
 * @deprecated Use processImageBuffer instead
 */
export const processImage = processImageBuffer

/**
 * Alias for processGifBuffer for backward compatibility
 * @deprecated Use processGifBuffer instead
 */
export const processGif = processGifBuffer
