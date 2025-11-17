/**
 * Notification Logger Utility
 *
 * Provides structured logging for notification system operations
 * to help detect and debug race conditions.
 */

import { logger } from './logger'

interface MutationLogDetails {
  id: string
  version: number
  timestamp?: string
}

interface RealtimeLogDetails {
  id: string
  event: string
  timestamp?: string
  commit_timestamp?: string
}

const LOG_PREFIX = '[Notification]'
const VERBOSE = process.env.NODE_ENV === 'development'

export const notificationLogger = {
  /**
   * Log mutation operations (mark as read, delete, etc.)
   */
  mutation: (action: string, data: MutationLogDetails) => {
    if (!VERBOSE) return

    const timestamp = data.timestamp || new Date().toISOString()
    logger.warn(`${LOG_PREFIX}[v${data.version}][Mutation] ${action}`, {
      id: data.id,
      timestamp,
      version: data.version,
    })
  },

  /**
   * Log realtime events
   */
  realtime: (data: RealtimeLogDetails) => {
    if (!VERBOSE) return

    const emoji = data.event === 'INSERT' ? '🔔' : data.event === 'UPDATE' ? '♻️' : '🗑️'
    logger.warn(`${LOG_PREFIX}[RT] ${emoji} ${data.event}`, {
      id: data.id,
      timestamp: data.timestamp,
      commit_timestamp: data.commit_timestamp,
    })
  },

  /**
   * Log detected race conditions
   */
  race: (type: string, details: Record<string, unknown>) => {
    logger.warn(`${LOG_PREFIX}[RACE] ⚠️ ${type}`, details)
  },

  /**
   * Log cache operations
   */
  cache: (operation: string, details: Record<string, unknown>) => {
    if (!VERBOSE) return

    logger.warn(`${LOG_PREFIX}[Cache] ${operation}`, details)
  },

  /**
   * Log version conflicts
   */
  versionConflict: (current: number, incoming: number, id: string) => {
    logger.warn(`${LOG_PREFIX}[Version] ⚠️ Conflict detected`, {
      current,
      incoming,
      id,
      message: `Ignoring stale event (v${incoming}) - current version is v${current}`,
    })
  },

  /**
   * Log duplicate detection
   */
  duplicate: (id: string, source: 'realtime' | 'mutation') => {
    logger.warn(`${LOG_PREFIX}[Duplicate] ⏭️ Skipped duplicate from ${source}`, { id })
  },

  /**
   * Log count updates
   */
  count: (action: string, count: number, delta?: number) => {
    if (!VERBOSE) return

    logger.warn(`${LOG_PREFIX}[Count] ${action}`, {
      count,
      delta,
      timestamp: new Date().toISOString(),
    })
  },

  /**
   * Log performance metrics
   */
  performance: (operation: string, duration: number) => {
    if (!VERBOSE) return

    if (duration > 100) {
      logger.warn(`${LOG_PREFIX}[Performance] ⚠️ Slow operation: ${operation}`, {
        duration: `${duration}ms`,
      })
    } else {
      logger.warn(`${LOG_PREFIX}[Performance] ${operation}`, { duration: `${duration}ms` })
    }
  },
}
