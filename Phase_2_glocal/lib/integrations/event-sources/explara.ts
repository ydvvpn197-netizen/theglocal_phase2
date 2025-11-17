/**
 * Explara Integration
 * Base URL: https://www.explara.com
 *
 * Scrapes events from Explara using cheerio for HTML parsing
 * External ID format: `explara-{event-id}`
 */

import * as cheerio from 'cheerio'
import { FetchConfig, PlatformFetchResult, StandardizedEvent } from './types'
import { logger } from '@/lib/utils/logger'

// City mapping for Explara URLs
const CITY_MAPPING: Record<string, string> = {
  Mumbai: 'mumbai',
  Delhi: 'delhi',
  Bengaluru: 'bangalore',
  Bangalore: 'bangalore',
  Hyderabad: 'hyderabad',
  Pune: 'pune',
  Kolkata: 'kolkata',
  Chennai: 'chennai',
  Ahmedabad: 'ahmedabad',
  Jaipur: 'jaipur',
  Goa: 'goa',
}

/**
 * Parse date string from Explara format
 * Handles various date formats
 */
function parseExplaraDate(dateStr: string): string {
  try {
    // Try parsing the date string
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch (error) {
    logger.warn('Failed to parse Explara date', { dateStr, error })
  }

  // Default to current date if parsing fails
  return new Date().toISOString()
}

/**
 * Extract event ID from URL
 */
function extractEventId(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    // Explara URLs often have format: /e/{event-slug}-{id}
    const lastPart = pathParts[pathParts.length - 1]
    return lastPart || `event-${Date.now()}`
  } catch {
    return `event-${Date.now()}`
  }
}

/**
 * Fetch events from Explara
 *
 * @param config - Fetch configuration
 * @returns Platform fetch result with events
 */
export async function fetchExplaraEvents(config: FetchConfig): Promise<PlatformFetchResult> {
  const { city, limit = 50 } = config
  const citySlug = CITY_MAPPING[city] || city.toLowerCase()

  try {
    logger.info(`[Explara] Fetching events for ${city}`)

    // Try multiple URL patterns
    const urlPatterns = [
      `https://www.explara.com/events/${citySlug}`,
      `https://www.explara.com/${citySlug}/events`,
      `https://www.explara.com/e/${citySlug}`,
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
          logger.warn(`[Explara] Failed to fetch ${url}`, { status: response.status })
          continue
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Try multiple selector patterns
        const eventSelectors = [
          '.event-item',
          '.event-card',
          '[data-event]',
          '.listing-item',
          '.event-box',
        ]

        for (const selector of eventSelectors) {
          const elements = $(selector)

          if (elements.length > 0) {
            logger.info(`[Explara] Found ${elements.length} events using selector ${selector}`)

            elements.each((_, element) => {
              try {
                const $el = $(element)

                // Extract event data using multiple fallback selectors
                const title = $el
                  .find('.event-name, .event-title, .title, h3, h4, h2')
                  .first()
                  .text()
                  .trim()
                const link = $el.find('a').first().attr('href')
                const imageUrl = $el.find('img').first().attr('src')
                const date = $el.find('.event-date, .date, time, .event-time').first().text().trim()
                const venue = $el.find('.event-location, .venue, .location').first().text().trim()
                const price = $el.find('.price, .event-price, .ticket-price').first().text().trim()

                if (title && link) {
                  const fullUrl = link.startsWith('http') ? link : `https://www.explara.com${link}`
                  const eventId = extractEventId(fullUrl)

                  events.push({
                    external_id: `explara-${eventId}`,
                    title,
                    description: title, // Explara often doesn't show full description in listings
                    category: 'other',
                    venue: venue || `${city} venue`,
                    city,
                    event_date: parseExplaraDate(date),
                    image_url: imageUrl?.startsWith('http') ? imageUrl : undefined,
                    ticket_url: fullUrl,
                    price: price || 'See website',
                    source_platform: 'explara',
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
                logger.warn('[Explara] Error parsing event', { error })
              }
            })

            break // Found events with this selector, no need to try others
          }
        }

        if (events.length > 0) {
          break // Found events from this URL pattern
        }
      } catch (error) {
        logger.warn(`[Explara] Error fetching ${url}`, { error })
      }
    }

    // Limit results
    const limitedEvents = events.slice(0, limit)

    logger.info(`[Explara] Successfully fetched ${limitedEvents.length} events for ${city}`)

    return {
      platform: 'explara',
      success: true,
      events: limitedEvents,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('[Explara] Error fetching events', error, { city })

    return {
      platform: 'explara',
      success: false,
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchedAt: new Date().toISOString(),
    }
  }
}
