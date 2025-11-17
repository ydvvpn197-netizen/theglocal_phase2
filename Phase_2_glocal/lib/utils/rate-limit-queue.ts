import { logger } from '@/lib/utils/logger'
/**
 * Centralized Rate Limiter
 *
 * Platform-specific rate limiting with exponential backoff and queue management
 */

export interface RateLimitConfig {
  minDelay: number // Minimum delay between requests in ms
  maxConcurrent?: number // Maximum concurrent requests
  maxRetries?: number // Maximum retry attempts
  retryDelay?: number // Base retry delay in ms
}

interface QueuedRequest<T> {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
  retries: number
  platform: string
}

export class RateLimiter {
  private queues: Map<string, QueuedRequest<unknown>[]> = new Map()
  private processing: Map<string, boolean> = new Map()
  private lastRequestTime: Map<string, number> = new Map()
  private activeRequests: Map<string, number> = new Map()
  private configs: Map<string, RateLimitConfig> = new Map()

  constructor() {
    // Initialize with default configs
    this.configs.set('default', {
      minDelay: 1000,
      maxConcurrent: 5,
      maxRetries: 3,
      retryDelay: 1000,
    })
  }

  /**
   * Configure rate limits for a platform
   */
  configure(platform: string, config: RateLimitConfig) {
    this.configs.set(platform, config)
  }

  /**
   * Add request to queue with rate limiting
   */
  async add<T>(platform: string, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        fn,
        resolve,
        reject,
        retries: 0,
        platform,
      }

      // Get or create queue for platform
      if (!this.queues.has(platform)) {
        this.queues.set(platform, [])
        this.activeRequests.set(platform, 0)
      }

      this.queues.get(platform)!.push(request as QueuedRequest<unknown>)

      // Start processing if not already processing
      if (!this.processing.get(platform)) {
        this.process(platform)
      }
    })
  }

  /**
   * Process queued requests for a platform
   */
  private async process(platform: string) {
    const queue = this.queues.get(platform)
    if (!queue || queue.length === 0) {
      this.processing.set(platform, false)
      return
    }

    this.processing.set(platform, true)

    const config = this.configs.get(platform) || this.configs.get('default')!
    const maxConcurrent = config.maxConcurrent || 5
    const activeCount = this.activeRequests.get(platform) || 0

    // Check if we can process more requests
    if (activeCount >= maxConcurrent) {
      // Wait a bit and try again
      setTimeout(() => this.process(platform), 100)
      return
    }

    // Get next request from queue
    const request = queue.shift()
    if (!request) {
      this.processing.set(platform, false)
      return
    }

    // Check rate limiting
    const now = Date.now()
    const lastRequest = this.lastRequestTime.get(platform) || 0
    const timeSinceLastRequest = now - lastRequest
    const minDelay = config.minDelay

    if (timeSinceLastRequest < minDelay) {
      // Wait before executing
      const waitTime = minDelay - timeSinceLastRequest
      setTimeout(() => {
        // Re-add to front of queue
        queue.unshift(request)
        this.process(platform)
      }, waitTime)
      return
    }

    // Execute request
    this.lastRequestTime.set(platform, Date.now())
    this.activeRequests.set(platform, activeCount + 1)

    try {
      const result = await request.fn()
      request.resolve(result)
    } catch (error) {
      // Retry logic
      const maxRetries = config.maxRetries || 3
      if (request.retries < maxRetries) {
        request.retries++
        const retryDelay = (config.retryDelay || 1000) * Math.pow(2, request.retries - 1)

        logger.warn(
          `Rate limiter: Retry ${request.retries}/${maxRetries} for ${platform} after ${retryDelay}ms`
        )

        setTimeout(() => {
          queue.unshift(request) // Add back to front of queue
          this.process(platform)
        }, retryDelay)
      } else {
        request.reject(error)
      }
    } finally {
      this.activeRequests.set(platform, Math.max(0, activeCount - 1))
    }

    // Continue processing
    if (queue.length > 0) {
      // Small delay before next request
      setTimeout(() => this.process(platform), 10)
    } else {
      this.processing.set(platform, false)
    }
  }

  /**
   * Get queue statistics
   */
  getStats(platform?: string) {
    if (platform) {
      return {
        platform,
        queued: this.queues.get(platform)?.length || 0,
        active: this.activeRequests.get(platform) || 0,
        processing: this.processing.get(platform) || false,
      }
    }

    // Return stats for all platforms
    const stats: Record<string, unknown> = {}
    for (const [plat, queue] of this.queues.entries()) {
      stats[plat] = {
        queued: queue.length,
        active: this.activeRequests.get(plat) || 0,
        processing: this.processing.get(plat) || false,
      }
    }
    return stats
  }

  /**
   * Clear all queues
   */
  clear(platform?: string) {
    if (platform) {
      this.queues.set(platform, [])
    } else {
      this.queues.clear()
      this.processing.clear()
      this.lastRequestTime.clear()
      this.activeRequests.clear()
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter()

// Configure platform-specific limits
globalRateLimiter.configure('bookmyshow', {
  minDelay: 2000, // 2 seconds between requests
  maxConcurrent: 2,
  maxRetries: 3,
  retryDelay: 2000,
})

globalRateLimiter.configure('insider', {
  minDelay: 2000, // 2 seconds between requests
  maxConcurrent: 2,
  maxRetries: 3,
  retryDelay: 2000,
})

globalRateLimiter.configure('allevents', {
  minDelay: 1000, // 1 second between requests
  maxConcurrent: 3,
  maxRetries: 3,
  retryDelay: 1000,
})

globalRateLimiter.configure('eventbrite', {
  minDelay: 1200, // ~50 requests per minute
  maxConcurrent: 5,
  maxRetries: 3,
  retryDelay: 1000,
})
