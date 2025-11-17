/**
 * Realtime Connection Manager
 * Manages Supabase Realtime subscriptions efficiently to handle connection limits
 * and prevent subscription leaks.
 */

import { logger } from '@/lib/utils/logger'
import { RealtimeChannel } from '@supabase/supabase-js'

interface SubscriptionInfo {
  channel: RealtimeChannel
  subscribers: number
  lastUsed: number
}

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

class RealtimeConnectionManager {
  private subscriptions: Map<string, SubscriptionInfo> = new Map()
  private readonly MAX_CONNECTIONS = 200 // Supabase limit
  private readonly CLEANUP_INTERVAL = 60000 // 1 minute
  private cleanupTimer: NodeJS.Timeout | null = null
  private readonly retryConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
  }

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * Get or create a subscription channel
   * Reuses existing channels when possible to minimize connections
   */
  getChannel(key: string, channelFactory: () => RealtimeChannel): RealtimeChannel {
    const existing = this.subscriptions.get(key)

    if (existing) {
      // Reuse existing channel
      existing.subscribers += 1
      existing.lastUsed = Date.now()
      return existing.channel
    }

    // Check connection limit
    if (this.subscriptions.size >= this.MAX_CONNECTIONS) {
      logger.warn(
        `[RealtimeManager] Connection limit reached (${this.MAX_CONNECTIONS}). Attempting cleanup...`
      )
      this.cleanupUnused()
    }

    // Create new channel
    const channel = channelFactory()
    this.subscriptions.set(key, {
      channel,
      subscribers: 1,
      lastUsed: Date.now(),
    })

    return channel
  }

  /**
   * Release a subscription channel
   * Only removes the channel when no subscribers remain
   */
  releaseChannel(key: string, _channel: RealtimeChannel): void {
    const subscription = this.subscriptions.get(key)

    if (!subscription) {
      logger.warn(`[RealtimeManager] Attempted to release unknown channel: ${key}`)
      return
    }

    subscription.subscribers -= 1
    subscription.lastUsed = Date.now()

    // Remove channel if no subscribers
    if (subscription.subscribers <= 0) {
      try {
        subscription.channel.unsubscribe()
      } catch (error) {
        logger.error(`[RealtimeManager] Error unsubscribing channel ${key}:`, error)
      }
      this.subscriptions.delete(key)
    }
  }

  /**
   * Cleanup unused subscriptions
   * Removes subscriptions that haven't been used in a while
   */
  private cleanupUnused(): void {
    const now = Date.now()
    const MAX_IDLE_TIME = 5 * 60 * 1000 // 5 minutes

    const keysToRemove: string[] = []

    this.subscriptions.forEach((subscription, key) => {
      if (subscription.subscribers === 0 && now - subscription.lastUsed > MAX_IDLE_TIME) {
        keysToRemove.push(key)
      }
    })

    keysToRemove.forEach((key) => {
      const subscription = this.subscriptions.get(key)
      if (subscription) {
        try {
          subscription.channel.unsubscribe()
        } catch (error) {
          logger.error(`[RealtimeManager] Error cleaning up channel ${key}:`, error)
        }
        this.subscriptions.delete(key)
      }
    })

    if (keysToRemove.length > 0) {
      logger.info(`[RealtimeManager] Cleaned up ${keysToRemove.length} unused subscriptions`)
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return

    this.cleanupTimer = setInterval(() => {
      this.cleanupUnused()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Get active subscription count
   */
  getActiveCount(): number {
    return this.subscriptions.size
  }

  /**
   * Get subscription info for debugging
   */
  getSubscriptionInfo(): Array<{ key: string; subscribers: number; lastUsed: number }> {
    return Array.from(this.subscriptions.entries()).map(([key, info]) => ({
      key,
      subscribers: info.subscribers,
      lastUsed: info.lastUsed,
    }))
  }

  /**
   * Cleanup all subscriptions (for testing or shutdown)
   */
  cleanupAll(): void {
    this.subscriptions.forEach((subscription, key) => {
      try {
        subscription.channel.unsubscribe()
      } catch (error) {
        logger.error(`[RealtimeManager] Error cleaning up channel ${key}:`, error)
      }
    })
    this.subscriptions.clear()
    this.stopCleanupTimer()
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return this.retryConfig
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
  },
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < config.maxRetries) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay)

        if (onRetry) {
          onRetry(attempt + 1, lastError)
        }

        logger.info(
          `[RealtimeManager] Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

// Singleton instance
export const realtimeConnectionManager = new RealtimeConnectionManager()

/**
 * Generate a unique key for a subscription
 */
export function generateSubscriptionKey(
  prefix: string,
  ...params: (string | number | null | undefined)[]
): string {
  const filtered = params.filter((p) => p !== null && p !== undefined)
  return `${prefix}-${filtered.join('-')}`
}
