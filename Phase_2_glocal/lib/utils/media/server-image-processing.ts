/**
 * @deprecated This file is deprecated. Use server-processing.ts instead.
 *
 * This file is kept for backward compatibility only.
 * New code should use:
 * - processImageBuffer() instead of processImage()
 * - processImageForUpload() for File-based uploads
 *
 * Migration guide:
 * - processImage(buffer, filename) → processImageBuffer(buffer, filename)
 * - All other functions remain the same
 */

// Re-export from unified server-processing for backward compatibility
export {
  processImageBuffer as processImage,
  processGifBuffer as processGif,
  isGifBuffer,
  IMAGE_SIZES,
  type ImageVariant,
  type MediaVariants,
} from './server-processing'
