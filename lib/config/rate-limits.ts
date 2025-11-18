/**
 * Rate Limit Configuration
 * Centralized rate limit presets and route categorization
 */

export type RateLimitPreset = 'HIGH_TRAFFIC' | 'STANDARD' | 'EXPENSIVE' | 'AUTH' | 'CRON' | 'NONE'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  preset: RateLimitPreset // Preset name for reference
}

/**
 * Rate limit presets for different route categories
 */
export const RATE_LIMIT_PRESETS: Record<RateLimitPreset, RateLimitConfig> = {
  HIGH_TRAFFIC: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    preset: 'HIGH_TRAFFIC',
  },
  STANDARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    preset: 'STANDARD',
  },
  EXPENSIVE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    preset: 'EXPENSIVE',
  },
  AUTH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    preset: 'AUTH',
  },
  CRON: {
    windowMs: 60 * 1000,
    maxRequests: Number.MAX_SAFE_INTEGER, // No limits for cron jobs
    preset: 'CRON',
  },
  NONE: {
    windowMs: 60 * 1000,
    maxRequests: Number.MAX_SAFE_INTEGER, // No limits
    preset: 'NONE',
  },
}

/**
 * Route path patterns mapped to rate limit presets
 * Routes are matched in order, first match wins
 */
export const RATE_LIMIT_ROUTE_MAP: Array<{ pattern: string | RegExp; preset: RateLimitPreset }> = [
  // Cron jobs - no limits
  { pattern: /^\/api\/cron\//, preset: 'CRON' },

  // Webhook routes - strict limits (IP-based, external services)
  { pattern: /\/webhook/, preset: 'AUTH' },
  { pattern: /\/paypal-webhook/, preset: 'AUTH' },
  { pattern: /\/subscription-webhook/, preset: 'AUTH' },

  // OAuth callbacks - expensive operations
  { pattern: /\/callback$/, preset: 'EXPENSIVE' },
  { pattern: /\/auth$/, preset: 'AUTH' },

  // Documentation routes - standard limits
  { pattern: /^\/api\/docs/, preset: 'STANDARD' },

  // Auth routes - strict limits
  { pattern: /^\/api\/auth\//, preset: 'AUTH' },

  // Expensive operations - lower limits
  { pattern: /^\/api\/upload\//, preset: 'EXPENSIVE' },
  { pattern: /^\/api\/geocoding\//, preset: 'EXPENSIVE' },
  { pattern: /^\/api\/analytics\//, preset: 'EXPENSIVE' },
  { pattern: /^\/api\/admin\//, preset: 'EXPENSIVE' },
  { pattern: /^\/api\/transparency\//, preset: 'EXPENSIVE' },
  { pattern: /^\/api\/stats\//, preset: 'EXPENSIVE' },
  { pattern: /^\/api\/v2\/analytics\//, preset: 'EXPENSIVE' },

  // High-traffic routes - higher limits
  { pattern: /^\/api\/feed/, preset: 'HIGH_TRAFFIC' },
  { pattern: /^\/api\/v2\/feed/, preset: 'HIGH_TRAFFIC' },
  { pattern: /^\/api\/posts/, preset: 'HIGH_TRAFFIC' },
  { pattern: /^\/api\/v2\/search/, preset: 'HIGH_TRAFFIC' },
  { pattern: /^\/api\/discover/, preset: 'HIGH_TRAFFIC' },

  // Standard routes - default limits
  { pattern: /^\/api\/communities/, preset: 'STANDARD' },
  { pattern: /^\/api\/v2\/communities/, preset: 'STANDARD' },
  { pattern: /^\/api\/events/, preset: 'STANDARD' },
  { pattern: /^\/api\/v2\/events/, preset: 'STANDARD' },
  { pattern: /^\/api\/artists/, preset: 'STANDARD' },
  { pattern: /^\/api\/v2\/artists/, preset: 'STANDARD' },
  { pattern: /^\/api\/locations/, preset: 'STANDARD' },
  { pattern: /^\/api\/v2\/locations/, preset: 'STANDARD' },
  { pattern: /^\/api\/comments/, preset: 'STANDARD' },
  { pattern: /^\/api\/polls/, preset: 'STANDARD' },
  { pattern: /^\/api\/messages/, preset: 'STANDARD' },
  { pattern: /^\/api\/notifications/, preset: 'STANDARD' },
  { pattern: /^\/api\/bookings/, preset: 'STANDARD' },
  { pattern: /^\/api\/drafts/, preset: 'STANDARD' },
  { pattern: /^\/api\/reports/, preset: 'STANDARD' },
  { pattern: /^\/api\/moderation/, preset: 'STANDARD' },
  { pattern: /^\/api\/profile/, preset: 'STANDARD' },
  { pattern: /^\/api\/users/, preset: 'STANDARD' },
  { pattern: /^\/api\/jobs/, preset: 'STANDARD' },

  // Default to standard for all other API routes
  { pattern: /^\/api\//, preset: 'STANDARD' },
]

/**
 * Get rate limit config for a given route path
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const { pattern, preset } of RATE_LIMIT_ROUTE_MAP) {
    if (typeof pattern === 'string') {
      if (pathname.startsWith(pattern)) {
        return RATE_LIMIT_PRESETS[preset]
      }
    } else if (pattern.test(pathname)) {
      return RATE_LIMIT_PRESETS[preset]
    }
  }

  // Default to standard if no match
  return RATE_LIMIT_PRESETS.STANDARD
}

/**
 * Check if a route should have rate limiting applied
 */
export function shouldRateLimit(pathname: string): boolean {
  const config = getRateLimitConfig(pathname)
  return config.preset !== 'CRON' && config.preset !== 'NONE'
}
