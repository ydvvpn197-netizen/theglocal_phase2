/**
 * Robots.txt Checker
 *
 * Respects robots.txt rules and crawl-delay directives
 */

import { logger } from '@/lib/utils/logger'
import robotsParser from 'robots-parser'

interface RobotsParser {
  isAllowed: (url: string, userAgent?: string) => boolean
  getCrawlDelay: (userAgent?: string) => number | false
}

interface RobotsCacheEntry {
  robots: RobotsParser
  fetchedAt: number
  crawlDelay: number
}

export class RobotsChecker {
  private cache: Map<string, RobotsCacheEntry> = new Map()
  private readonly cacheLifetime = 24 * 60 * 60 * 1000 // 24 hours
  private readonly defaultCrawlDelay = 1000 // 1 second default

  /**
   * Check if a URL is allowed to be scraped
   */
  async isAllowed(url: string, userAgent: string = 'TheGlocalBot'): Promise<boolean> {
    try {
      const urlObj = new URL(url)
      const origin = urlObj.origin
      const robots = await this.getRobots(origin)

      if (!robots) {
        // If can't fetch robots.txt, assume allowed but be cautious
        return true
      }

      return robots.isAllowed(url, userAgent)
    } catch (error) {
      logger.warn('Robots.txt check error:', error)
      return true // Default to allowed on error
    }
  }

  /**
   * Get crawl delay for a domain
   */
  async getCrawlDelay(origin: string, userAgent: string = 'TheGlocalBot'): Promise<number> {
    try {
      const cached = this.cache.get(origin)

      if (cached && Date.now() - cached.fetchedAt < this.cacheLifetime) {
        return cached.crawlDelay
      }

      const robots = await this.getRobots(origin)
      if (!robots) {
        return this.defaultCrawlDelay
      }

      const crawlDelay = robots.getCrawlDelay(userAgent)
      return crawlDelay ? crawlDelay * 1000 : this.defaultCrawlDelay
    } catch (error) {
      logger.warn('Crawl delay check error:', error)
      return this.defaultCrawlDelay
    }
  }

  /**
   * Fetch and parse robots.txt for a domain
   */
  private async getRobots(origin: string): Promise<RobotsParser | null> {
    try {
      // Check cache first
      const cached = this.cache.get(origin)
      if (cached && Date.now() - cached.fetchedAt < this.cacheLifetime) {
        return cached.robots
      }

      // Fetch robots.txt
      const robotsUrl = `${origin}/robots.txt`
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': 'TheGlocalBot/1.0 (Event Aggregator; +https://theglocal.in)',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (!response.ok) {
        logger.warn(`robots.txt not found for ${origin}, assuming allowed`)
        return null
      }

      const robotsTxt = await response.text()
      const robots = robotsParser(robotsUrl, robotsTxt) as RobotsParser

      // Get crawl delay
      const crawlDelay =
        robots.getCrawlDelay('TheGlocalBot') ||
        robots.getCrawlDelay('*') ||
        this.defaultCrawlDelay / 1000

      // Cache the result
      this.cache.set(origin, {
        robots,
        fetchedAt: Date.now(),
        crawlDelay: crawlDelay * 1000,
      })

      return robots
    } catch (error) {
      logger.warn(`Failed to fetch robots.txt for ${origin}:`, error)
      return null
    }
  }

  /**
   * Clear cache
   */
  clearCache(origin?: string) {
    if (origin) {
      this.cache.delete(origin)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Check if scraping is allowed and get recommended delay
   */
  async checkAccess(
    url: string,
    userAgent: string = 'TheGlocalBot'
  ): Promise<{
    allowed: boolean
    crawlDelay: number
    message?: string
  }> {
    try {
      const urlObj = new URL(url)
      const origin = urlObj.origin

      const allowed = await this.isAllowed(url, userAgent)
      const crawlDelay = await this.getCrawlDelay(origin, userAgent)

      if (!allowed) {
        return {
          allowed: false,
          crawlDelay,
          message: `Scraping ${url} is disallowed by robots.txt`,
        }
      }

      return {
        allowed: true,
        crawlDelay,
        message: `Scraping allowed with ${crawlDelay}ms crawl delay`,
      }
    } catch {
      return {
        allowed: true,
        crawlDelay: this.defaultCrawlDelay,
        message: 'Error checking robots.txt, proceeding with caution',
      }
    }
  }
}

// Global robots checker instance
export const globalRobotsChecker = new RobotsChecker()
