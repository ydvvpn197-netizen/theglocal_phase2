/**
 * Townscript Integration
 * Base URL: https://www.townscript.com
 *
 * Scrapes events from Townscript using cheerio for HTML parsing
 * External ID format: `townscript-{event-slug}`
 */

import * as cheerio from 'cheerio'
import { FetchConfig, PlatformFetchResult, StandardizedEvent } from './types'
import { logger } from '@/lib/utils/logger'

// City mapping for Townscript URLs
const CITY_MAPPING: Record<string, string> = {
  Mumbai: 'mumbai',
  Delhi: 'delhi',
  Bengaluru: 'bengaluru',
  Bangalore: 'bengaluru',
  Hyderabad: 'hyderabad',
  Pune: 'pune',
  Kolkata: 'kolkata',
  Chennai: 'chennai',
  Ahmedabad: 'ahmedabad',
  Jaipur: 'jaipur',
  Goa: 'goa',
}

/**
 * Parse date string from Townscript format
 * Handles various date formats
 */
function parseTownscriptDate(dateStr: string): string {
  try {
    // Try parsing the date string
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch (error) {
    logger.warn('Failed to parse Townscript date', { dateStr, error })
  }

  // Default to current date if parsing fails
  return new Date().toISOString()
}

/**
 * Extract event ID/slug from URL
 */
function extractEventId(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    return pathParts[pathParts.length - 1] || `event-${Date.now()}`
  } catch {
    return `event-${Date.now()}`
  }
}

/**
 * Fetch events from Townscript
 *
 * @param config - Fetch configuration
 * @returns Platform fetch result with events
 */
export async function fetchTownscriptEvents(config: FetchConfig): Promise<PlatformFetchResult> {
  const { city, limit = 50 } = config
  const citySlug = CITY_MAPPING[city] || city.toLowerCase()

  try {
    logger.info(`[Townscript] Fetching events for ${city}`)

    // Try multiple URL patterns
    const urlPatterns = [
      `https://www.townscript.com/in/${citySlug}/online`,
      `https://www.townscript.com/in/${citySlug}`,
    ]

    const events: StandardizedEvent[] = []

    for (const url of urlPatterns) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (!response.ok) {
          logger.warn(`[Townscript] Failed to fetch ${url}`, { status: response.status })
          continue
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Try multiple selector patterns
        const eventSelectors = ['.event-card', '.event-item', '[data-event-id]', '.listing-card']

        for (const selector of eventSelectors) {
          const elements = $(selector)

          if (elements.length > 0) {
            logger.info(`[Townscript] Found ${elements.length} events using selector ${selector}`)

            elements.each((_, element) => {
              try {
                const $el = $(element)

                // Extract event data using multiple fallback selectors
                const title = $el.find('.event-title, .title, h3, h4').first().text().trim()
                const link = $el.find('a').first().attr('href')
                const imageUrl = $el.find('img').first().attr('src')
                const date = $el.find('.event-date, .date, time').first().text().trim()
                const venue = $el.find('.event-venue, .venue, .location').first().text().trim()
                const price = $el.find('.price, .ticket-price').first().text().trim()

                if (title && link) {
                  const fullUrl = link.startsWith('http')
                    ? link
                    : `https://www.townscript.com${link}`
                  const eventId = extractEventId(fullUrl)

                  events.push({
                    external_id: `townscript-${eventId}`,
                    title,
                    description: title, // Townscript often doesn't show description in listings
                    category: 'other',
                    venue: venue || `${city} venue`,
                    city,
                    event_date: parseTownscriptDate(date),
                    image_url: imageUrl?.startsWith('http') ? imageUrl : undefined,
                    ticket_url: fullUrl,
                    price: price || 'See website',
                    source_platform: 'townscript',
                    raw_data: {
                      title,
                      link: fullUrl,
                      date,
                      venue,
                      price,
                    },
                  })
                }
              } catch (error) {
                logger.warn('[Townscript] Error parsing event', { error })
              }
            })

            break // Found events with this selector, no need to try others
          }
        }

        if (events.length > 0) {
          break // Found events from this URL pattern
        }
      } catch (error) {
        logger.warn(`[Townscript] Error fetching ${url}`, { error })
      }
    }

    // Limit results
    const limitedEvents = events.slice(0, limit)

    logger.info(`[Townscript] Successfully fetched ${limitedEvents.length} events for ${city}`)

    return {
      platform: 'townscript',
      success: true,
      events: limitedEvents,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('[Townscript] Error fetching events', error, { city })

    return {
      platform: 'townscript',
      success: false,
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchedAt: new Date().toISOString(),
    }
  }
}

/**
 * TODO: Implement the following:
 *
 * 1. City mapping:
 *    - Mumbai, Delhi, Bengaluru, etc. → city slugs/parameters
 *
 * 2. Scraping strategy:
 *    - Inspect Townscript website structure
 *    - Use Playwright if content is JavaScript-rendered
 *    - Alternative: Check if they have an API
 *    - Wait for event cards/listings to load
 *    - Extract: title, date, venue, price, image, category
 *
 * 3. Event standardization:
 *    - Map to StandardizedEvent format
 *    - Generate deterministic external_id using generateEventExternalIdFromUrl
 *    - Parse Townscript-specific date formats
 *    - Map Townscript categories to standard categories
 *
 * 4. Rate limiting:
 *    - Use globalRateLimiter.add('townscript', ...)
 *    - Respect platform rate limits
 *
 * 5. Error handling:
 *    - Use scraperLogger for detailed logging
 *    - Handle selector timeouts gracefully
 *    - Return partial results on error
 *    - Log validation errors
 *
 * 6. Robots.txt compliance:
 *    - Check with globalRobotsChecker before scraping
 *    - Respect crawl delays
 *
 * 7. Testing:
 *    - Test with multiple cities
 *    - Verify event deduplication
 *    - Check date parsing accuracy
 *    - Validate external IDs are unique
 */
