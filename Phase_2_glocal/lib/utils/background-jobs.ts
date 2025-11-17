import { logger } from '@/lib/utils/logger'
import { processMediaFile, MediaProcessingResult } from './media/server-processing'

// Simple in-memory job queue (in production, use Redis or proper job queue)
interface Job {
  id: string
  type: 'media_processing' | 'video_thumbnail' | 'image_optimization'
  data: unknown
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  error?: string
  result?: unknown
  retries: number
  maxRetries: number
}

class BackgroundJobQueue {
  private jobs: Map<string, Job> = new Map()
  private isProcessing = false
  private maxConcurrency = 3
  private currentlyProcessing = 0

  constructor() {
    // Start processing jobs
    this.startProcessing()
  }

  /**
   * Add a job to the queue
   */
  addJob(type: Job['type'], data: unknown, maxRetries = 3): string {
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    const job: Job = {
      id: jobId,
      type,
      data,
      status: 'pending',
      createdAt: new Date(),
      retries: 0,
      maxRetries,
    }

    this.jobs.set(jobId, job)
    logger.info(`📋 Job added: ${jobId} (${type})`)

    // Trigger processing if not already running
    if (!this.isProcessing) {
      this.processNextJob()
    }

    return jobId
  }

  /**
   * Get job status
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get all jobs (for debugging)
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Start the job processing loop
   */
  private startProcessing() {
    this.isProcessing = true
    this.processNextJob()
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob() {
    if (this.currentlyProcessing >= this.maxConcurrency) {
      return
    }

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values()).find((job) => job.status === 'pending')

    if (!pendingJob) {
      // No pending jobs, check again in 5 seconds
      setTimeout(() => this.processNextJob(), 5000)
      return
    }

    this.currentlyProcessing++
    await this.processJob(pendingJob)
    this.currentlyProcessing--

    // Process next job immediately
    setImmediate(() => this.processNextJob())
  }

  /**
   * Process a specific job
   */
  private async processJob(job: Job) {
    logger.info(`🔄 Processing job: ${job.id} (${job.type})`)

    job.status = 'processing'
    this.jobs.set(job.id, job)

    try {
      let result: unknown

      switch (job.type) {
        case 'media_processing': {
          const data = job.data as { file: File; folder: string }
          result = await this.processMediaJob(data)
          break
        }
        case 'video_thumbnail': {
          const data = job.data as { videoUrl: string; thumbnailPath: string }
          result = await this.processVideoThumbnailJob(data)
          break
        }
        case 'image_optimization': {
          const data = job.data as { imageUrl: string; optimizations: string[] }
          result = await this.processImageOptimizationJob(data)
          break
        }
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result
      this.jobs.set(job.id, job)

      logger.info(`✅ Job completed: ${job.id}`)
    } catch (error) {
      logger.error(`❌ Job failed: ${job.id}`, error)

      job.retries++
      if (job.retries < job.maxRetries) {
        logger.info(`🔄 Retrying job: ${job.id} (attempt ${job.retries + 1}/${job.maxRetries})`)
        job.status = 'pending'

        // Add delay before retry (exponential backoff)
        setTimeout(
          () => {
            this.jobs.set(job.id, job)
          },
          Math.pow(2, job.retries) * 1000
        )
      } else {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : 'Unknown error'
        job.completedAt = new Date()
      }

      this.jobs.set(job.id, job)
    }
  }

  /**
   * Process media file job
   */
  private async processMediaJob(data: {
    file: File
    folder: string
  }): Promise<MediaProcessingResult> {
    return await processMediaFile(data.file, data.folder)
  }

  /**
   * Process video thumbnail generation job
   */
  private async processVideoThumbnailJob(data: {
    videoUrl: string
    thumbnailPath: string
  }): Promise<{ thumbnailUrl: string }> {
    // In production, use FFmpeg or cloud service for video thumbnail generation
    logger.info('Video thumbnail generation not implemented yet')
    return { thumbnailUrl: data.videoUrl } // Placeholder
  }

  /**
   * Process image optimization job
   */
  private async processImageOptimizationJob(_data: {
    imageUrl: string
    optimizations: string[]
  }): Promise<{ optimizedUrls: Record<string, string> }> {
    // Additional image optimizations like AI upscaling, watermarking, etc.
    logger.info('Advanced image optimization not implemented yet')
    return { optimizedUrls: {} } // Placeholder
  }

  /**
   * Clean up old completed jobs (prevent memory leaks)
   */
  cleanup() {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoffDate
      ) {
        this.jobs.delete(jobId)
      }
    }
  }
}

// Singleton instance
const jobQueue = new BackgroundJobQueue()

// Cleanup old jobs every hour
setInterval(
  () => {
    jobQueue.cleanup()
  },
  60 * 60 * 1000
)

export { jobQueue }

// Convenience functions
export const addMediaProcessingJob = (file: File, folder: string = 'media') => {
  return jobQueue.addJob('media_processing', { file, folder })
}

export const addVideoThumbnailJob = (videoUrl: string, thumbnailPath: string) => {
  return jobQueue.addJob('video_thumbnail', { videoUrl, thumbnailPath })
}

export const addImageOptimizationJob = (imageUrl: string, optimizations: string[]) => {
  return jobQueue.addJob('image_optimization', { imageUrl, optimizations })
}

export const getJobStatus = (jobId: string) => {
  return jobQueue.getJob(jobId)
}

export const getAllJobs = () => {
  return jobQueue.getAllJobs()
}
