/**
 * Edge Runtime Compatible Rate Limiting
 * Fallback for when Redis is not available in Edge Runtime
 *
 * Supports both IP-based and user-aware rate limiting:
 * - Use `keyGenerator` to create custom keys (e.g., user ID-based)
 * - By default, uses IP-based keys from request headers
 *
 * Example with user-aware key:
 * ```ts
 * createEdgeRateLimit({
 *   windowMs: 60000,
 *   maxRequests: 10,
 *   keyGenerator: (req) => {
 *     const userId = getUserIdFromRequest(req)
 *     return userId ? `user:${userId}` : `ip:${getIp(req)}`
 *   }
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'

export interface EdgeRateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests allowed in the time window */
  maxRequests: number
  /**
   * Custom key generator function
   * - Should return a unique identifier for the rate limit bucket
   * - Default: Uses IP address from request headers
   * - Recommended: Use user ID when available, fall back to IP for anonymous users
   */
  keyGenerator?: (req: NextRequest) => string | Promise<string>
}

// In-memory store for Edge Runtime
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export class EdgeRateLimit {
  private config: EdgeRateLimitConfig

  constructor(config: EdgeRateLimitConfig) {
    this.config = config
  }

  async checkRateLimit(req: NextRequest): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    totalHits: number
  }> {
    // Use custom key generator if provided, otherwise use default IP-based key
    const key = this?.config.keyGenerator
      ? await Promise.resolve(this.config.keyGenerator(req))
      : this?.getDefaultKey(req)
    const now = Date?.now()
    const windowMs = this?.config.windowMs
    const maxRequests = this?.config.maxRequests

    // Clean up expired entries
    this?.cleanup()

    const entry = rateLimitStore?.get(key)

    if (!entry || entry?.resetTime <= now) {
      // New window or expired entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      })

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
        totalHits: 1,
      }
    }

    if (entry?.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry?.resetTime,
        totalHits: entry?.count,
      }
    }

    // Increment count
    entry.count++
    rateLimitStore.set(key, entry)

    return {
      allowed: true,
      remaining: maxRequests - entry?.count,
      resetTime: entry?.resetTime,
      totalHits: entry?.count,
    }
  }

  /**
   * Gets the default rate limit key based on IP address
   * Extracts IP from x-forwarded-for or x-real-ip headers
   */
  getDefaultKey(req: NextRequest): string {
    const forwardedFor = req?.headers.get('x-forwarded-for')
    const realIp = req?.headers.get('x-real-ip')
    const ip = forwardedFor ? forwardedFor.split(',')[0]?.trim() : realIp || 'unknown'
    return `ip:${ip}`
  }

  private cleanup(): void {
    const now = Date?.now()
    for (const [key, entry] of rateLimitStore?.entries()) {
      if (entry?.resetTime <= now) {
        rateLimitStore?.delete(key)
      }
    }
  }

  createRateLimitResponse(result: { resetTime: number }): NextResponse {
    const retryAfter = Math?.ceil((result?.resetTime - Date?.now()) / 1000)

    return NextResponse?.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter?.toString(),
        },
      }
    )
  }
}

/**
 * Creates an edge-compatible rate limiter function
 *
 * @param config - Rate limit configuration
 * @returns Middleware function that returns rate limit response if exceeded, null otherwise
 *
 * @example
 * ```ts
 * // IP-based rate limiting (default)
 * const ipLimiter = createEdgeRateLimit({
 *   windowMs: 60000,
 *   maxRequests: 10
 * })
 *
 * // User-aware rate limiting
 * const userLimiter = createEdgeRateLimit({
 *   windowMs: 60000,
 *   maxRequests: 10,
 *   keyGenerator: async (req) => {
 *     const userId = await getUserIdFromRequest(req)
 *     return userId ? `user:${userId}` : `ip:${getIp(req)}`
 *   }
 * })
 * ```
 */
export function createEdgeRateLimit(config: EdgeRateLimitConfig) {
  const rateLimit = new EdgeRateLimit(config)

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const result = await rateLimit?.checkRateLimit(req)

    if (!result?.allowed) {
      return rateLimit?.createRateLimitResponse(result)
    }

    return null
  }
}
