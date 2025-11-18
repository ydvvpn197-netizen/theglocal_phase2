/**
 * Centralized Duplicate Prevention Utility
 *
 * Provides a simple, memory-efficient way to track and prevent duplicate events
 * with automatic cleanup to prevent memory leaks.
 */

import { logger } from '@/lib/utils/logger'

interface TrackedItem {
  timestamp: number
}

class DuplicatePrevention {
  private items: Map<string, TrackedItem> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly maxAge: number
  private readonly maxSize: number

  constructor(maxAgeMs: number = 5 * 60 * 1000, maxSize: number = 1000) {
    this.maxAge = maxAgeMs
    this.maxSize = maxSize
    this.startCleanup()
  }

  /**
   * Check if an item has been seen recently
   * @param id - Unique identifier for the item
   * @returns true if already seen, false if new
   */
  hasSeen(id: string): boolean {
    return this.items.has(id)
  }

  /**
   * Mark an item as seen
   * @param id - Unique identifier for the item
   */
  markSeen(id: string): void {
    // If we're at max size, remove oldest entry first
    if (this.items.size >= this.maxSize) {
      this.removeOldest()
    }

    this.items.set(id, { timestamp: Date.now() })
  }

  /**
   * Check if seen and mark as seen in one operation
   * @param id - Unique identifier for the item
   * @returns true if already seen, false if new
   */
  checkAndMark(id: string): boolean {
    const seen = this.hasSeen(id)
    if (!seen) {
      this.markSeen(id)
    }
    return seen
  }

  /**
   * Remove an item from tracking
   * @param id - Unique identifier for the item
   */
  remove(id: string): void {
    this.items.delete(id)
  }

  /**
   * Clear all tracked items
   */
  clear(): void {
    this.items.clear()
  }

  /**
   * Get current size
   */
  size(): number {
    return this.items.size
  }

  /**
   * Remove oldest entry when at capacity
   */
  private removeOldest(): void {
    let oldestId: string | null = null
    let oldestTime = Infinity

    for (const [id, item] of this.items.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestId = id
      }
    }

    if (oldestId) {
      this.items.delete(oldestId)
    }
  }

  /**
   * Clean up expired items
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredIds: string[] = []

    for (const [id, item] of this.items.entries()) {
      if (now - item.timestamp > this.maxAge) {
        expiredIds.push(id)
      }
    }

    expiredIds.forEach((id) => this.items.delete(id))

    if (expiredIds.length > 0) {
      logger.info('[DuplicatePrevention] Cleaned up expired items', { count: expiredIds.length })
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (typeof window === 'undefined') return

    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000
    )
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Destroy instance and clean up
   */
  destroy(): void {
    this.stopCleanup()
    this.clear()
  }
}

/**
 * Create a new duplicate prevention instance
 * @param maxAgeMs - Maximum age in milliseconds before items expire (default: 5 minutes)
 * @param maxSize - Maximum number of items to track (default: 1000)
 */
export function createDuplicatePrevention(
  maxAgeMs?: number,
  maxSize?: number
): DuplicatePrevention {
  return new DuplicatePrevention(maxAgeMs, maxSize)
}

/**
 * Singleton instance for general use
 * Use createDuplicatePrevention() for isolated instances
 */
export const defaultDuplicatePrevention = createDuplicatePrevention()
