/**
 * @deprecated This file is deprecated. Use server-processing.ts instead.
 *
 * This file is kept for backward compatibility only.
 * New code should use:
 * - processImageForUpload() instead of processImage()
 * - processMediaFile() and processMediaFiles() remain the same (re-exported)
 *
 * Migration guide:
 * - processImage(file, folder) → processImageForUpload(file, folder)
 * - processMediaFile() and processMediaFiles() can be imported from server-processing
 */

// Re-export from unified server-processing for backward compatibility
export {
  processImageForUpload as processImage,
  processMediaFile,
  processMediaFiles,
  type ProcessedImageVariants,
  type ProcessedVideoResult,
  type MediaProcessingResult,
} from './server-processing'
