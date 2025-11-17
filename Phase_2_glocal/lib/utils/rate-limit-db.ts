/**
 * Database-backed rate limiter using Supabase
 * Provides persistent rate limiting across server restarts and multiple instances
 */

import { createClient } from '@/lib/supabase/server'
import Redis from 'ioredis'
import { logger } from '@/lib/utils/logger'

export interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// In-memory fallback store for when database is unavailable
interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const fallbackStore: RateLimitStore = {}

let redisClient: Redis | null = null

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    })
    redisClient.on('error', (error) => {
      logger.error('Redis rate limit error', error instanceof Error ? error : undefined, {
        context: 'rate-limit-db',
      })
    })
  }

  return redisClient
}

// Clean up expired fallback entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date?.now()
      Object?.keys(fallbackStore).forEach((key) => {
        const entry = fallbackStore[key]
        if (entry && entry.resetAt < now) {
          delete fallbackStore[key]
        }
      })
    },
    5 * 60 * 1000
  )
}

/**
 * Fallback in-memory rate limiting when database is unavailable
 */
function fallbackRateLimit(
  identifier: string,
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date?.now()
  const key = `${identifier}:${action}`

  // Initialize or get existing entry
  if (!fallbackStore[key] || fallbackStore[key].resetAt < now) {
    fallbackStore[key] = {
      count: 0,
      resetAt: now + config.interval,
    }
  }

  const entry = fallbackStore[key]
  entry.count++

  const success = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

  return {
    success,
    limit: config.maxRequests,
    remaining,
    reset: entry.resetAt,
  }
}

async function redisRateLimit(
  identifier: string,
  action: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const client = getRedisClient()
  if (!client) {
    return null
  }

  const key = `rl:${action}:${identifier}`
  const ttlMs = config.interval
  const now = Date.now()

  try {
    const results = await client.multi().incr(key).pttl(key).exec()

    if (!results) {
      return null
    }

    const incrResult = results[0]?.[1]
    const ttlResult = results[1]?.[1]

    if (typeof incrResult !== 'number') {
      return null
    }

    let ttl = typeof ttlResult === 'number' ? ttlResult : -1
    if (ttl === -1 || ttl === -2) {
      await client.pexpire(key, ttlMs)
      ttl = ttlMs
    }

    const remaining = Math.max(0, config.maxRequests - incrResult)
    const reset = now + (ttl > 0 ? ttl : ttlMs)

    return {
      success: incrResult <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      reset,
    }
  } catch (error) {
    logger.error('Redis rate limit error', error instanceof Error ? error : undefined, {
      context: 'rate-limit-db',
      identifier,
      action,
    })
    return null
  }
}

/**
 * Database-backed rate limiting using Supabase
 * Falls back to in-memory if database is unavailable
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { interval: 60000, maxRequests: 10 },
  action: string = 'default'
): Promise<RateLimitResult> {
  try {
    const supabase = await createClient()

    // Calculate window in seconds
    const windowSeconds = Math.ceil(config.interval / 1000)

    // Call database function to check and increment rate limit
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action: action,
      p_max_requests: config.maxRequests,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      logger.warn('Rate limit database check failed, checking Redis fallback', {
        error: error instanceof Error ? error.message : String(error),
        identifier,
        action,
      })
      const redisResult = await redisRateLimit(identifier, action, config)
      if (redisResult) {
        return redisResult
      }
      return fallbackRateLimit(identifier, action, config)
    }

    if (!data || data.length === 0) {
      logger.warn('Rate limit function returned no data, checking Redis fallback', {
        identifier,
        action,
      })
      const redisResult = await redisRateLimit(identifier, action, config)
      if (redisResult) {
        return redisResult
      }
      return fallbackRateLimit(identifier, action, config)
    }

    const result = data[0] as Record<string, unknown>
    const resetAt = new Date(result.reset_at as string | number | Date).getTime()

    return {
      success: (result.allowed as boolean) ?? false,
      limit: config.maxRequests,
      remaining: (result.remaining as number) ?? 0,
      reset: resetAt,
    }
  } catch (error) {
    logger.error('Rate limit check error', error instanceof Error ? error : undefined, {
      context: 'rate-limit-db',
      identifier,
      action,
    })
    const redisResult = await redisRateLimit(identifier, action, config)
    if (redisResult) {
      return redisResult
    }
    // Fail open - allow request if database is down
    return fallbackRateLimit(identifier, action, config)
  }
}

// Pre-configured rate limit presets
export const RateLimitPresets = {
  // Community creation: 5 per hour
  COMMUNITY_CREATE: { interval: 60 * 60 * 1000, maxRequests: 5 },

  // Post creation: 10 per hour
  POST_CREATE: { interval: 60 * 60 * 1000, maxRequests: 10 },

  // Comment creation: 30 per hour
  COMMENT_CREATE: { interval: 60 * 60 * 1000, maxRequests: 30 },

  // Join/Leave: 20 per hour
  MEMBERSHIP: { interval: 60 * 60 * 1000, maxRequests: 20 },

  // API requests: 100 per minute
  API_GENERAL: { interval: 60 * 1000, maxRequests: 100 },
}
