/**
 * Client-side image optimization utilities
 * Uses browser-image-compression for client-side optimization
 */

import { logger } from '@/lib/utils/logger'
import imageCompression from 'browser-image-compression'

export interface ImageCompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  quality?: number
}

/**
 * Compress an image file on the client side
 * Reduces file size before upload to improve performance
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 2, // Max file size in MB
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true, // Use web worker for better performance
    quality: 0.8, // Image quality (0-1)
    ...options,
  }

  try {
    // Don't compress GIFs as it may break animation
    if (file.type === 'image/gif') {
      return file
    }

    const compressedFile = await imageCompression(file, defaultOptions)

    // Return original if compression didn't help
    if (compressedFile.size >= file.size) {
      return file
    }

    return compressedFile
  } catch (error) {
    logger.error('Image compression failed:', error)
    // Return original file if compression fails
    return file
  }
}

/**
 * Validate file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Validate file is a GIF
 */
export function isGifFile(file: File): boolean {
  return file.type === 'image/gif'
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Create a preview URL for a file
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}
