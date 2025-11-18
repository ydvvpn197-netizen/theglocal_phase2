/**
 * Unified Rate Limiting Middleware
 * Auto-detects Redis availability and uses distributed or in-memory rate limiting
 * Always adds rate limit headers to responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { isRedisAvailable } from '@/lib/redis/client'
import { RedisRateLimit } from '@/lib/middleware/redis-rate-limit'
import { EdgeRateLimit } from '@/lib/middleware/edge-rate-limit'
import { getRateLimitConfig, shouldRateLimit, type RateLimitConfig } from '@/lib/config/rate-limits'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalHits: number
  limit: number
}

/**
 * Get identifier for rate limiting (user ID or IP)
 */
async function getIdentifier(req: NextRequest): Promise<string> {
  // Try to get user ID from Supabase session
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.id) {
      return `user:${user.id}`
    }
  } catch (error) {
    // Fall back to IP if session check fails
    logger.debug('Failed to get user from session, falling back to IP', { error })
  }

  // Try to get user ID from auth header
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '')
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1] ?? ''))
        const userId = payload?.sub || payload?.user_id
        if (userId) {
          return `user:${userId}`
        }
      }
    } catch {
      // Fall back to IP if token parsing fails
    }
  }

  // Fall back to IP address
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwardedFor ? forwardedFor.split(',')[0]?.trim() : realIp || 'unknown'

  return `ip:${ip}`
}

/**
 * Get action type from request pathname
 */
function getAction(req: NextRequest): string {
  const pathname = req.nextUrl.pathname

  // Extract action from pathname
  if (pathname.includes('/api/')) {
    const parts = pathname.split('/api/')[1]?.split('/') || []
    // Use first two parts for more granular rate limiting (e.g., "posts/vote", "auth/login")
    return parts.slice(0, 2).join('/') || 'unknown'
  }

  return 'page'
}

/**
 * Check rate limit using Redis or in-memory fallback
 */
async function checkRateLimit(req: NextRequest, config: RateLimitConfig): Promise<RateLimitResult> {
  const identifier = await getIdentifier(req)
  const action = getAction(req)
  const key = `${action}:${identifier}`

  // Check if Redis is available
  const useRedis = await isRedisAvailable().catch(() => false)

  if (useRedis) {
    try {
      const redisLimiter = new RedisRateLimit({
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        keyGenerator: () => key,
      })

      const result = await redisLimiter.checkRateLimit(req)
      return {
        ...result,
        limit: config.maxRequests,
      }
    } catch (error) {
      logger.error('Redis rate limit check failed, falling back to in-memory', { error })
      // Fall through to in-memory
    }
  }

  // Use in-memory rate limiting (Edge-compatible)
  const edgeLimiter = new EdgeRateLimit({
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
    keyGenerator: () => key,
  })

  const result = await edgeLimiter.checkRateLimit(req)
  return {
    ...result,
    limit: config.maxRequests,
  }
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  const headers = new Headers(response.headers)

  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString())
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())

  // Only add Retry-After on rate limit exceeded
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    headers.set('Retry-After', Math.max(0, retryAfter).toString())
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Create rate limit error response
 */
function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    },
    {
      status: 429,
    }
  )

  return addRateLimitHeaders(response, result)
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 * Automatically detects route path and applies appropriate limits
 *
 * @example
 * ```ts
 * export const GET = withRateLimit(async (req) => {
 *   // Your handler code
 *   return NextResponse.json({ data: 'ok' })
 * })
 * ```
 */
export function withRateLimit<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  customConfig?: RateLimitConfig
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    // Get rate limit config for this route
    const pathname = req.nextUrl.pathname
    const config = customConfig || getRateLimitConfig(pathname)

    // Skip rate limiting for routes that shouldn't be limited
    if (!shouldRateLimit(pathname) && !customConfig) {
      return handler(req, ...args)
    }

    // Check rate limit
    const result = await checkRateLimit(req, config)

    // If rate limit exceeded, return error response
    if (!result.allowed) {
      return createRateLimitResponse(result)
    }

    // Execute handler
    const response = await handler(req, ...args)

    // Add rate limit headers to response
    return addRateLimitHeaders(response, result)
  }
}

/**
 * Create rate limit middleware function
 * Useful for manual rate limit checks
 *
 * @example
 * ```ts
 * const rateLimitMiddleware = createRateLimitMiddleware()
 * const result = await rateLimitMiddleware(req)
 * if (result) {
 *   return result // Rate limit exceeded
 * }
 * // Continue with handler
 * ```
 */
export function createRateLimitMiddleware(customConfig?: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const pathname = req.nextUrl.pathname
    const config = customConfig || getRateLimitConfig(pathname)

    if (!shouldRateLimit(pathname) && !customConfig) {
      return null
    }

    const result = await checkRateLimit(req, config)

    if (!result.allowed) {
      return createRateLimitResponse(result)
    }

    return null
  }
}

/**
 * Get rate limit info for a request without enforcing limits
 * Useful for displaying rate limit status to users
 */
export async function getRateLimitInfo(req: NextRequest): Promise<RateLimitResult> {
  const pathname = req.nextUrl.pathname
  const config = getRateLimitConfig(pathname)

  return checkRateLimit(req, config)
}
