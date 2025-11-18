/**
 * Generic Web Scraper Utility
 *
 * Provides rate-limited, ethical web scraping capabilities
 */

import { logger } from '@/lib/utils/logger'
import { SCRAPER_CONFIG } from './scraper-config'

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Rate limiter class
 */
class RateLimiter {
  private lastRequestTime = 0
  private requestInterval: number

  constructor(requestsPerSecond: number) {
    this.requestInterval = 1000 / requestsPerSecond
  }

  async waitForNextSlot(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.requestInterval) {
      const waitTime = this.requestInterval - timeSinceLastRequest
      await sleep(waitTime)
    }

    this.lastRequestTime = Date.now()
  }
}

const rateLimiters = new Map<string, RateLimiter>()

/**
 * Get or create rate limiter for a platform
 */
function getRateLimiter(platform: string, requestsPerSecond: number): RateLimiter {
  if (!rateLimiters.has(platform)) {
    rateLimiters.set(platform, new RateLimiter(requestsPerSecond))
  }
  return rateLimiters.get(platform)!
}

/**
 * Fetch with rate limiting and retries
 */
export async function fetchWithRateLimit(
  url: string,
  platform: string,
  options: {
    requestsPerSecond?: number
    timeout?: number
    retries?: number
    headers?: Record<string, string>
  } = {}
): Promise<string> {
  const {
    requestsPerSecond = SCRAPER_CONFIG.rateLimit.requestsPerSecond,
    timeout = SCRAPER_CONFIG.timeout,
    retries = SCRAPER_CONFIG.retries,
    headers = {},
  } = options

  const rateLimiter = getRateLimiter(platform, requestsPerSecond)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Wait for rate limit slot
      await rateLimiter.waitForNextSlot()

      logger.info(`[${platform}] Fetching: ${url} (attempt ${attempt + 1}/${retries + 1})`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        headers: {
          'User-Agent': SCRAPER_CONFIG.userAgent,
          ...SCRAPER_CONFIG.headers,
          ...headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()

      logger.info(`[${platform}] Successfully fetched ${url} (${html.length} bytes)`)

      return html
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn(`[${platform}] Fetch failed (attempt ${attempt + 1}):`, lastError.message)

      if (attempt < retries) {
        const waitTime = SCRAPER_CONFIG.rateLimit.retryDelay * (attempt + 1)
        logger.info(`[${platform}] Retrying in ${waitTime}ms...`)
        await sleep(waitTime)
      }
    }
  }

  throw lastError || new Error('Failed to fetch')
}

/**
 * Check robots.txt compliance
 */
export async function checkRobotsTxt(
  baseUrl: string,
  path: string,
  userAgent: string = SCRAPER_CONFIG.userAgent
): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString()
    const response = await fetch(robotsUrl)

    if (!response.ok) {
      // If robots.txt doesn't exist, assume crawling is allowed
      return true
    }

    const robotsTxt = await response.text()

    // Simple robots.txt parser
    const lines = robotsTxt.split('\n')
    let currentUserAgent = ''
    let isAllowed = true

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase()

      if (trimmed.startsWith('user-agent:')) {
        currentUserAgent = trimmed.substring('user-agent:'.length).trim()
      } else if (
        (currentUserAgent === '*' || currentUserAgent === userAgent.toLowerCase()) &&
        trimmed.startsWith('disallow:')
      ) {
        const disallowedPath = trimmed.substring('disallow:'.length).trim()
        if (disallowedPath && path.startsWith(disallowedPath)) {
          isAllowed = false
          break
        }
      }
    }

    return isAllowed
  } catch (error) {
    logger.warn('Failed to check robots.txt:', error)
    // If we can't check, be conservative and allow
    return true
  }
}

/**
 * Extract text content safely
 */
export function extractText(
  element: { text?: () => string | undefined } | null | undefined
): string {
  if (!element) return ''
  return element.text?.()?.trim() || ''
}

/**
 * Extract attribute safely
 */
export function extractAttr(
  element: { attr?: (name: string) => string | undefined } | null | undefined,
  attr: string
): string | undefined {
  if (!element) return undefined
  return element.attr?.(attr) || undefined
}

/**
 * Parse date string to ISO format
 */
export function parseEventDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return undefined
    return date.toISOString()
  } catch {
    return undefined
  }
}
