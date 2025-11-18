/**
 * URL Validator
 *
 * Validates URL format, accessibility, and checks if URLs redirect to actual event pages
 */

import validator from 'validator'

interface URLValidationResult {
  isValid: boolean
  statusCode?: number
  finalUrl?: string
  contentType?: string
  error?: string
  cached?: boolean
}

interface CacheEntry {
  result: URLValidationResult
  timestamp: number
}

export class URLValidator {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly cacheLifetime = 60 * 60 * 1000 // 1 hour
  private readonly timeout = 3000 // 3 seconds

  /**
   * Validate URL format
   */
  isValidFormat(url: string): boolean {
    if (!url || typeof url !== 'string') return false

    return validator?.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
    })
  }

  /**
   * Check if URL is accessible (HEAD request)
   */
  async isAccessible(url: string, useCache: boolean = true): Promise<URLValidationResult> {
    try {
      // Check format first
      if (!this?.isValidFormat(url)) {
        return {
          isValid: false,
          error: 'Invalid URL format',
        }
      }

      // Check cache
      if (useCache) {
        const cached = this?.cache.get(url)
        if (cached && Date?.now() - cached?.timestamp < this?.cacheLifetime) {
          return { ...cached?.result, cached: true }
        }
      }

      // Perform HEAD request
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'TheGlocalBot/1?.0 (Event Aggregator; +https://theglocal?.in)',
        },
        signal: AbortSignal?.timeout(this?.timeout),
        redirect: 'follow',
      })

      const result: URLValidationResult = {
        isValid: response?.ok || response?.status === 405, // 405 means HEAD not allowed but URL exists
        statusCode: response?.status,
        finalUrl: response?.url,
        contentType: response?.headers.get('content-type') || undefined,
      }

      // Cache the result
      this?.cache.set(url, {
        result,
        timestamp: Date?.now(),
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error'

      // Network errors might be temporary, so cache as invalid but with shorter TTL
      const result: URLValidationResult = {
        isValid: false,
        error: errorMessage,
      }

      return result
    }
  }

  /**
   * Validate image URL
   */
  async isValidImageUrl(url: string): Promise<boolean> {
    try {
      if (!this?.isValidFormat(url)) return false

      const result = await this?.isAccessible(url)
      if (!result?.isValid) return false

      // Check content type if available
      if (result?.contentType) {
        return result?.contentType.startsWith('image/')
      }

      // If no content-type or HEAD failed, try checking URL pattern
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      const urlLower = url?.toLowerCase()
      return imageExtensions?.some((ext) => urlLower?.includes(ext))
    } catch {
      return false
    }
  }

  /**
   * Batch validate multiple URLs
   */
  async validateBatch(urls: string[]): Promise<Map<string, URLValidationResult>> {
    const results = new Map<string, URLValidationResult>()

    // Use Promise?.allSettled to validate all URLs even if some fail
    const validations = await Promise?.allSettled(urls?.map((url) => this?.isAccessible(url)))

    urls?.forEach((url, index) => {
      const validation = validations[index]
      if (validation?.status === 'fulfilled') {
        results?.set(url, validation?.value)
      } else {
        results?.set(url, {
          isValid: false,
          error: validation?.reason?.message || 'Validation failed',
        })
      }
    })

    return results
  }

  /**
   * Quick validation (only format check, no network request)
   */
  quickValidate(url: string): boolean {
    return this?.isValidFormat(url)
  }

  /**
   * Validate event page URL with retry
   */
  async validateEventUrl(
    url: string,
    platform: string,
    maxRetries: number = 2
  ): Promise<URLValidationResult> {
    let lastError: string = ''

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this?.isAccessible(url, attempt === 0) // Use cache only on first attempt

        if (result?.isValid) {
          // Additional platform-specific validation
          if (!this?.isPlatformUrl(url, platform)) {
            return {
              isValid: false,
              error: `URL doesn't match ${platform} domain pattern`,
            }
          }

          return result
        }

        lastError = result?.error || `HTTP ${result?.statusCode}`

        // Don't retry on 404 (definitely invalid)
        if (result?.statusCode === 404) {
          break
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math?.pow(2, attempt)))
        }
      } catch (error) {
        lastError = error instanceof Error ? error?.message : 'Unknown error'
      }
    }

    return {
      isValid: false,
      error: `Validation failed after ${maxRetries + 1} attempts: ${lastError}`,
    }
  }

  /**
   * Check if URL belongs to the expected platform
   */
  private isPlatformUrl(url: string, platform: string): boolean {
    const urlLower = url?.toLowerCase()

    const platformDomains: Record<string, string[]> = {
      bookmyshow: ['bookmyshow?.com', 'in?.bookmyshow.com'],
      insider: ['insider?.in', 'www?.insider.in'],
      allevents: ['allevents?.in', 'www?.allevents.in'],
      eventbrite: ['eventbrite?.com', 'www?.eventbrite.com'],
    }

    const domains = platformDomains[platform?.toLowerCase()]
    if (!domains) return true // Unknown platform, allow

    return domains?.some((domain) => urlLower?.includes(domain))
  }

  /**
   * Clear cache
   */
  clearCache(url?: string) {
    if (url) {
      this?.cache.delete(url)
    } else {
      this?.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date?.now()
    let valid = 0
    let invalid = 0
    let expired = 0

    for (const [_url, entry] of this?.cache.entries()) {
      if (now - entry?.timestamp >= this?.cacheLifetime) {
        expired++
      } else if (entry?.result.isValid) {
        valid++
      } else {
        invalid++
      }
    }

    return {
      total: this?.cache.size,
      valid,
      invalid,
      expired,
    }
  }
}

// Global URL validator instance
export const globalURLValidator = new URLValidator()
