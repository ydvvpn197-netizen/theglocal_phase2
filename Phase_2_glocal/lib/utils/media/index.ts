/**
 * Media Processing Utilities
 *
 * Unified exports for all media processing functions
 */

// Client-side media processing
export * from './media-processing'

// Server-side media processing (unified)
export {
  processImageBuffer,
  processImageForUpload,
  processGifBuffer,
  processMediaFile,
  processMediaFiles,
  isGifBuffer,
  // Backward compatibility aliases
  processImage,
  processGif,
  // Types
  type ImageVariant,
  type MediaVariants,
  type ProcessedImageVariants,
  type ProcessedVideoResult,
  type MediaProcessingResult,
  // Constants
  IMAGE_SIZES,
  IMAGE_QUALITY,
} from './server-processing'

// Video processing utilities
export { formatDuration, type VideoMetadata as VideoProcessingMetadata } from './video-processing'

// Video upload utilities
export * from './video-upload'

// Video utilities (client-side)
export {
  generateVideoThumbnail,
  getVideoDuration,
  getVideoMetadata,
  formatVideoDuration,
  type VideoMetadata,
} from './video-utils'

// Legacy exports for backward compatibility (deprecated - use server-processing instead)
export {
  processImage as processServerImage,
  type MediaVariants as ServerMediaVariants,
} from './server-processing'
