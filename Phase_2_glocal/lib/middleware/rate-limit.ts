/**
 * Rate Limiting Middleware
 * Prevents API abuse and DDoS attacks
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per interval
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limit middleware
 * @param req - Next.js request object
 * @param config - Rate limit configuration
 * @returns Response if rate limited, null otherwise
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100, // 100 requests per minute
  }
): Promise<NextResponse | null> {
  // Get identifier (IP address or user ID)
  const identifier = getIdentifier(req)

  const now = Date.now()
  const resetTime = now + config.interval

  // Get or create rate limit entry
  let rateLimitEntry = rateLimitMap.get(identifier)

  if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
    // Create new entry or reset expired one
    rateLimitEntry = {
      count: 0,
      resetTime,
    }
    rateLimitMap.set(identifier, rateLimitEntry)
  }

  // Increment request count
  rateLimitEntry.count++

  // Check if rate limit exceeded
  if (rateLimitEntry.count > config.uniqueTokenPerInterval) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${Math.ceil((rateLimitEntry.resetTime - now) / 1000)} seconds.`,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.uniqueTokenPerInterval.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitEntry.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitEntry.resetTime - now) / 1000).toString(),
        },
      }
    )
  }

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    cleanupExpiredEntries()
  }

  return null
}

/**
 * Get unique identifier for rate limiting
 */
function getIdentifier(req: NextRequest): string {
  // Try to get user ID from auth token if available
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from token (simplified - in production, verify JWT)
    return `user:${authHeader}`
  }

  // Fall back to IP address
  const forwardedFor = req.headers.get('x-forwarded-for')
  const ip = forwardedFor
    ? (forwardedFor.split(',')[0]?.trim() ?? req.ip ?? 'unknown')
    : req.ip || 'unknown'

  return `ip:${ip}`
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  const entriesToDelete: string[] = []

  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) {
      entriesToDelete.push(key)
    }
  })

  entriesToDelete.forEach((key) => rateLimitMap.delete(key))
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(
  handler: (req: NextRequest, context: { params?: unknown }) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: NextRequest, context: { params?: unknown }) => {
    // Check rate limit
    const rateLimitResponse = await rateLimit(req, config)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Proceed with handler
    return handler(req, context)
  }
}
