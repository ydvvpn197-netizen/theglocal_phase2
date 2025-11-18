// Chunked upload utility for real-time progress tracking
import { logger } from '@/lib/utils/logger'
// validateFormData removed - form data validation handled by API

export interface ChunkedUploadOptions {
  chunkSize: number // Size of each chunk in bytes
  maxRetries: number // Maximum retries per chunk
  onProgress: (progress: UploadProgress) => void
  onChunkComplete: (chunkIndex: number, totalChunks: number) => void
  onComplete: (result: UploadResult) => void
  onError: (error: Error) => void
  signal?: AbortSignal // For upload cancellation
  folder?: string // Folder path for storing the file (default: 'media')
}

export interface UploadProgress {
  fileId: string
  fileName: string
  loaded: number // Bytes uploaded
  total: number // Total file size
  percentage: number // 0-100
  speed: number // Bytes per second
  estimatedTimeRemaining: number // Seconds
  status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled'
  error?: string
}

export interface UploadResult {
  id: string
  url: string
  variants: Record<string, unknown>
  mediaType: 'image' | 'video' | 'gif'
  fileSize: number
  mimeType: string
  duration?: number
  thumbnailUrl?: string
  altText: string
}

interface ChunkUploadResponse {
  success: boolean
  chunkIndex: number
  uploadId: string
  error?: string
}

interface CompleteUploadResponse {
  success: boolean
  result: UploadResult
  error?: string
}

export class ChunkedUploader {
  private uploadId: string
  private file: File
  private options: ChunkedUploadOptions
  private chunks: Blob[] = []
  private uploadedChunks: Set<number> = new Set()
  private startTime: number = 0
  private lastProgressTime: number = 0
  private lastProgressLoaded: number = 0
  private cancelled: boolean = false

  constructor(file: File, options: ChunkedUploadOptions) {
    this.file = file
    this.options = options
    this.uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    this.prepareChunks()
  }

  /**
   * Get the upload ID
   */
  getUploadId(): string {
    return this.uploadId
  }

  /**
   * Get the file being uploaded
   */
  getFile(): File {
    return this.file
  }

  /**
   * Check if the upload is cancelled
   */
  isCancelled(): boolean {
    return this.cancelled
  }

  /**
   * Prepare file chunks
   */
  private prepareChunks() {
    const { chunkSize } = this.options
    this.chunks = []

    for (let start = 0; start < this.file.size; start += chunkSize) {
      const end = Math.min(start + chunkSize, this.file.size)
      this.chunks.push(this.file.slice(start, end))
    }

    logger.info(`Prepared ${this.chunks.length} chunks for ${this.file.name}`)
  }

  /**
   * Start chunked upload
   */
  async start(): Promise<void> {
    try {
      this.startTime = Date.now()
      this.lastProgressTime = this.startTime
      this.lastProgressLoaded = 0

      this.updateProgress({
        status: 'preparing',
        loaded: 0,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
      })

      // Initialize upload session
      await this.initializeUpload()

      if (this.cancelled) return

      this.updateProgress({
        status: 'uploading',
        loaded: 0,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
      })

      // Upload chunks concurrently (but limit concurrency)
      await this.uploadChunks()

      if (this.cancelled) return

      this.updateProgress({
        status: 'processing',
        loaded: this.file.size,
        percentage: 100,
        speed: this.calculateSpeed(this.file.size),
        estimatedTimeRemaining: 0,
      })

      // Complete upload and process file
      const result = await this.completeUpload()

      this.updateProgress({
        status: 'completed',
        loaded: this.file.size,
        percentage: 100,
        speed: this.calculateSpeed(this.file.size),
        estimatedTimeRemaining: 0,
      })

      this.options.onComplete(result)
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('Upload failed')

      this.updateProgress({
        status: 'error',
        error: uploadError.message,
      })

      this.options.onError(uploadError)
    }
  }

  /**
   * Cancel upload
   */
  cancel() {
    this.cancelled = true

    this.updateProgress({
      status: 'cancelled',
      error: 'Upload cancelled by user',
    })
  }

  /**
   * Initialize upload session on server
   */
  private async initializeUpload(): Promise<void> {
    const response = await fetch('/api/upload/chunked/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: this.uploadId,
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type,
        totalChunks: this.chunks.length,
        chunkSize: this.options.chunkSize,
      }),
      signal: this.options.signal,
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: string }
      throw new Error(error.error || 'Failed to initialize upload')
    }
  }

  /**
   * Upload all chunks with concurrency control
   */
  private async uploadChunks(): Promise<void> {
    const maxConcurrency = 3
    const chunkPromises: Promise<void>[] = []

    for (let i = 0; i < this.chunks.length; i++) {
      if (this.cancelled) break

      // Wait if we've reached max concurrency
      if (chunkPromises.length >= maxConcurrency) {
        await Promise.race(chunkPromises)
        // Remove completed promises
        chunkPromises.splice(
          0,
          chunkPromises.findIndex((p) => p !== Promise.race(chunkPromises))
        )
      }

      const chunkPromise = this.uploadChunk(i).then(() => {
        // Remove this promise from the array when done
        const index = chunkPromises.indexOf(chunkPromise)
        if (index > -1) chunkPromises.splice(index, 1)
      })

      chunkPromises.push(chunkPromise)
    }

    // Wait for all remaining chunks to complete
    await Promise.all(chunkPromises)
  }

  /**
   * Upload a single chunk with retry logic
   */
  private async uploadChunk(chunkIndex: number, retryCount = 0): Promise<void> {
    if (this.cancelled) return
    if (this.uploadedChunks.has(chunkIndex)) return // Already uploaded

    const chunk = this.chunks[chunkIndex]
    if (!chunk) {
      throw new Error(`Chunk ${chunkIndex} not found`)
    }
    const formData = new FormData()
    formData.append('uploadId', this.uploadId)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('chunk', chunk)

    // Form data validation is handled by the API endpoint

    try {
      const response = await fetch('/api/upload/chunked/chunk', {
        method: 'POST',
        body: formData,
        signal: this.options.signal,
      })

      if (!response.ok) {
        const error = (await response.json()) as { error?: string }
        throw new Error(error.error || `Failed to upload chunk ${chunkIndex}`)
      }

      const result: ChunkUploadResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || `Chunk ${chunkIndex} upload failed`)
      }

      // Mark chunk as uploaded
      this.uploadedChunks.add(chunkIndex)

      // Update progress
      const loadedBytes = this.uploadedChunks.size * this.options.chunkSize
      const actualLoadedBytes = Math.min(loadedBytes, this.file.size)

      this.updateProgress({
        status: 'uploading',
        loaded: actualLoadedBytes,
        percentage: (actualLoadedBytes / this.file.size) * 100,
        speed: this.calculateSpeed(actualLoadedBytes),
        estimatedTimeRemaining: this.calculateETA(actualLoadedBytes),
      })

      // Notify chunk completion
      this.options.onChunkComplete(chunkIndex, this.chunks.length)
    } catch (error) {
      if (this.cancelled) return

      logger.error(`Chunk ${chunkIndex} upload failed:`, error)

      if (retryCount < this.options.maxRetries) {
        logger.info(
          `Retrying chunk ${chunkIndex} (attempt ${retryCount + 1}/${this.options.maxRetries})`
        )

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000))

        return this.uploadChunk(chunkIndex, retryCount + 1)
      } else {
        throw new Error(
          `Failed to upload chunk ${chunkIndex} after ${this.options.maxRetries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Complete upload and trigger server-side processing
   */
  private async completeUpload(): Promise<UploadResult> {
    const response = await fetch('/api/upload/chunked/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: this.uploadId,
        fileName: this.file.name,
        folder: this.options.folder || 'media',
      }),
      signal: this.options.signal,
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: string }
      throw new Error(error.error || 'Failed to complete upload')
    }

    const result: CompleteUploadResponse = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Upload completion failed')
    }

    return result.result
  }

  /**
   * Update progress callback
   */
  private updateProgress(update: Partial<UploadProgress>) {
    const progress: UploadProgress = {
      fileId: this.uploadId,
      fileName: this.file.name,
      loaded: update.loaded ?? 0,
      total: this.file.size,
      percentage: update.percentage ?? 0,
      speed: update.speed ?? 0,
      estimatedTimeRemaining: update.estimatedTimeRemaining ?? 0,
      status: update.status ?? 'preparing',
      error: update.error,
    }

    this.options.onProgress(progress)
  }

  /**
   * Calculate upload speed in bytes per second
   */
  private calculateSpeed(loadedBytes: number): number {
    const now = Date.now()
    const timeDiff = (now - this.lastProgressTime) / 1000 // Convert to seconds
    const bytesDiff = loadedBytes - this.lastProgressLoaded

    if (timeDiff === 0) return 0

    const speed = bytesDiff / timeDiff

    // Update for next calculation
    this.lastProgressTime = now
    this.lastProgressLoaded = loadedBytes

    return Math.max(0, speed)
  }

  /**
   * Calculate estimated time remaining in seconds
   */
  private calculateETA(loadedBytes: number): number {
    const speed = this.calculateSpeed(loadedBytes)
    if (speed === 0) return 0

    const remainingBytes = this.file.size - loadedBytes
    return remainingBytes / speed
  }
}

/**
 * Convenience function to start chunked upload
 */
export function startChunkedUpload(
  file: File,
  options: Partial<ChunkedUploadOptions> = {}
): ChunkedUploader {
  const defaultOptions: ChunkedUploadOptions = {
    chunkSize: 1024 * 1024, // 1MB chunks
    maxRetries: 3,
    onProgress: () => {},
    onChunkComplete: () => {},
    onComplete: () => {},
    onError: () => {},
    ...options,
  }

  const uploader = new ChunkedUploader(file, defaultOptions)
  uploader.start()
  return uploader
}
