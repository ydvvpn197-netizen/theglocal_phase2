/**
 * Redis-based Rate Limiting Middleware
 * Provides distributed rate limiting using Redis
 */

import { NextRequest } from 'next/server'
import { redisUtils, RedisKeys } from '@/lib/redis/client'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (req: NextRequest) => string // Custom key generator
  onLimitReached?: (req: NextRequest, key: string) => void // Callback when limit reached
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalHits: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
}

export class RedisRateLimit {
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(req: NextRequest): Promise<RateLimitResult> {
    const key = this.generateKey(req)
    const windowSeconds = Math.ceil(this.config.windowMs / 1000)

    try {
      // Get current count
      const currentCount = await redisUtils.incrWithExpiry(key, windowSeconds)

      const remaining = Math.max(0, this.config.maxRequests - currentCount)
      const resetTime = Date.now() + this.config.windowMs
      const allowed = currentCount <= this.config.maxRequests

      // Call callback if limit reached
      if (!allowed && this.config.onLimitReached) {
        this.config.onLimitReached(req, key)
      }

      return {
        allowed,
        remaining,
        resetTime,
        totalHits: currentCount,
      }
    } catch (error) {
      // Dynamic import to avoid circular dependencies
      const { logger } = await import('@/lib/utils/logger')
      logger.error('Rate limit check failed', error as Error)
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: this?.config.maxRequests,
        resetTime: Date?.now() + this?.config.windowMs,
        totalHits: 0,
      }
    }
  }

  /**
   * Generate rate limit key for request
   */
  private generateKey(req: NextRequest): string {
    if (this?.config.keyGenerator) {
      return this?.config.keyGenerator(req)
    }

    // Default key generation
    const identifier = this?.getIdentifier(req)
    const action = this?.getAction(req)
    return RedisKeys?.rateLimit(identifier, action)
  }

  /**
   * Get identifier for rate limiting (user ID or IP)
   */
  private getIdentifier(req: NextRequest): string {
    // Try to get user ID from auth header
    const authHeader = req?.headers.get('authorization')
    if (authHeader) {
      // Extract user ID from JWT token (simplified)
      try {
        const token = authHeader?.replace('Bearer ', '')
        const tokenParts = token?.split('.')
        if (tokenParts?.length !== 3) throw new Error('Invalid token format')
        const payload = JSON?.parse(atob(tokenParts[1] ?? ''))
        return `user:${payload?.sub || payload?.user_id}`
      } catch {
        // Fall back to IP if token parsing fails
      }
    }

    // Fall back to IP address
    const forwardedFor = req?.headers.get('x-forwarded-for')
    const realIp = req?.headers.get('x-real-ip')
    const ip = forwardedFor ? forwardedFor.split(',')[0]?.trim() : realIp || 'unknown'
    return `ip:${ip}`
  }

  /**
   * Get action type from request
   */
  private getAction(req: NextRequest): string {
    const pathname = req.nextUrl.pathname

    // Extract action from pathname
    if (pathname.includes('/api/')) {
      return pathname.split('/api/')[1]?.split('/')[0] || 'unknown'
    }

    return 'page'
  }
}
