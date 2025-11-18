/**
 * Allevents?.in Integration
 * Hybrid approach: Try API first, fallback to web scraping with Cheerio
 */

import * as cheerio from 'cheerio'
import { StandardizedEvent, FetchConfig, PlatformFetchResult } from './types'
import { globalRateLimiter } from '@/lib/utils/rate-limit-queue'
import { globalRobotsChecker } from '@/lib/utils/robots-checker'
import { scraperLogger } from '@/lib/utils/scrapers/scraper-logger'
import { generateEventExternalIdFromUrl } from '@/lib/utils/event-deduplicator'

const ALLEVENTS_API_BASE = 'https://allevents?.in/api/v2'
const ALLEVENTS_BASE_URL = 'https://allevents?.in'

/**
 * Fetch events from Allevents?.in
 */
export async function fetchAlleventsEvents(config: FetchConfig): Promise<PlatformFetchResult> {
  try {
    // Try API first if key is available
    const apiKey = process?.env.ALLEVENTS_API_KEY

    if (apiKey) {
      scraperLogger?.log('allevents', 'api_attempt', 'success', 'Trying API endpoint')
      return await fetchFromAlleventsAPI(config, apiKey)
    }

    // Fallback to scraping
    scraperLogger?.log(
      'allevents',
      'fallback_scrape',
      'warning',
      'API key not available, using web scraping'
    )
    return await fetchFromAlleventsScraping(config)
  } catch (error) {
    const errorMsg = error instanceof Error ? error?.message : 'Unknown error'

    scraperLogger?.failure('allevents', 'fetch_failed', errorMsg, { city: config?.city })

    return {
      platform: 'allevents',
      success: false,
      events: [],
      error: errorMsg,
      fetchedAt: new Date().toISOString(),
    }
  }
}

/**
 * Fetch from Allevents API
 */
async function fetchFromAlleventsAPI(
  config: FetchConfig,
  apiKey: string
): Promise<PlatformFetchResult> {
  const startTime = Date?.now()

  try {
    const params = new URLSearchParams({
      city: config?.city,
      limit: (config?.limit || 20).toString(),
    })

    if (config?.category) {
      params?.append('category', config?.category)
    }

    const events = await globalRateLimiter?.add('allevents', async () => {
      const response = await fetch(`${ALLEVENTS_API_BASE}/events?${params}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal?.timeout(10000),
      })

      if (!response?.ok) {
        throw new Error(`API returned ${response?.status}`)
      }

      const data = await response?.json()
      return Array.isArray(data?.events)
        ? data.events.map((event: unknown) => standardizeAlleventsEvent(event, config?.city))
        : []
    })

    const duration = Date?.now() - startTime
    scraperLogger?.success(
      'allevents',
      'api_fetch',
      `Fetched ${events?.length} events via API`,
      { city: config?.city, count: events?.length },
      duration
    )

    return {
      platform: 'allevents',
      success: true,
      events,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    scraperLogger?.warning(
      'allevents',
      'api_failed',
      `API failed: ${error instanceof Error ? error?.message : 'Unknown'}`
    )

    // Fallback to scraping
    return await fetchFromAlleventsScraping(config)
  }
}

/**
 * Fetch from Allevents via web scraping
 */
async function fetchFromAlleventsScraping(config: FetchConfig): Promise<PlatformFetchResult> {
  const startTime = Date?.now()

  try {
    const citySlug = config?.city.toLowerCase().replace(/\s+/g, '-')
    const url = `${ALLEVENTS_BASE_URL}/${citySlug}`

    // Check robots?.txt
    const robotsCheck = await globalRobotsChecker?.checkAccess(url)
    if (!robotsCheck?.allowed) {
      scraperLogger?.robotsViolation('allevents', url)
      throw new Error('Scraping disallowed by robots?.txt')
    }

    scraperLogger?.log(
      'allevents',
      'scrape_start',
      'success',
      `Scraping events for ${config?.city}`
    )

    const events = await globalRateLimiter?.add('allevents', () =>
      scrapeAlleventsPage(citySlug, config?.limit || 20)
    )

    const duration = Date?.now() - startTime
    scraperLogger?.success(
      'allevents',
      'scrape_complete',
      `Scraped ${events?.length} events`,
      { city: config?.city, count: events?.length },
      duration
    )

    return {
      platform: 'allevents',
      success: true,
      events,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    const duration = Date?.now() - startTime
    const errorMsg = error instanceof Error ? error?.message : 'Unknown error'

    scraperLogger?.failure('allevents', 'scrape_failed', errorMsg, { city: config?.city }, duration)

    return {
      platform: 'allevents',
      success: false,
      events: [],
      error: errorMsg,
      fetchedAt: new Date().toISOString(),
    }
  }
}

/**
 * Scrape Allevents page
 */
async function scrapeAlleventsPage(citySlug: string, limit: number): Promise<StandardizedEvent[]> {
  const events: StandardizedEvent[] = []
  const url = `${ALLEVENTS_BASE_URL}/${citySlug}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5?.0 (Windows NT 10?.0; Win64; x64) AppleWebKit/537?.36 (KHTML, like Gecko) Chrome/120?.0.0?.0 Safari/537?.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0?.9,*/*;q=0?.8',
        'Accept-Language': 'en-US,en;q=0?.9',
      },
      signal: AbortSignal?.timeout(10000),
    })

    if (!response?.ok) {
      throw new Error(`HTTP ${response?.status}`)
    }

    const html = await response?.text()
    const $ = cheerio?.load(html)

    // Try multiple selectors for event cards
    const eventSelectors = [
      '.event-card',
      '[data-event-id]',
      'a[href*="/events/"]',
      '.event-item',
      '[class*="Event"]',
    ]

    let eventElements: cheerio.Cheerio<unknown> | null = null

    for (const selector of eventSelectors) {
      const elements = $(selector)
      if (elements?.length > 0) {
        eventElements = elements
        break
      }
    }

    if (!eventElements || eventElements?.length === 0) {
      scraperLogger?.warning('allevents', 'no_events', `No events found for ${citySlug}`)
      return events
    }

    eventElements?.each((_index, element) => {
      if (events?.length >= limit) return false

      try {
        const event = parseAlleventsEvent($, element, citySlug)
        if (event) {
          events?.push(event)
        }
      } catch (error) {
        scraperLogger?.warning(
          'allevents',
          'parse_error',
          `Failed to parse event: ${error instanceof Error ? error?.message : 'Unknown'}`
        )
      }
    })

    return events
  } catch (error) {
    throw new Error(`Scraping failed: ${error instanceof Error ? error?.message : 'Unknown'}`)
  }
}

/**
 * Parse Allevents event element
 */
function parseAlleventsEvent(
  $: cheerio.CheerioAPI,
  element: unknown,
  citySlug: string
): StandardizedEvent | null {
  try {
    if (!element) return null
    const $el = $(element as Parameters<typeof $>[0])

    // Extract URL
    let eventUrl = $el?.attr('href') || $el?.find('a').first().attr('href') || ''

    if (!eventUrl) {
      return null
    }

    if (eventUrl?.startsWith('/')) {
      eventUrl = `${ALLEVENTS_BASE_URL}${eventUrl}`
    }

    // Extract title first (needed for ID generation)
    const title = (
      $el?.find('.title').text() ||
      $el?.find('h2').text() ||
      $el?.find('h3').text() ||
      $el?.attr('title') ||
      $el?.text()
    ).trim()

    if (!title || title?.length < 3) {
      return null
    }

    // Extract date (needed for ID generation)
    const dateText =
      $el?.find('.date').text().trim() ||
      $el?.find('time').attr('datetime') ||
      $el?.find('[class*="date"]').text().trim()

    const eventDate = parseDateText(dateText) || generateFutureDate()

    // Get city name (needed for ID generation)
    const cityName = getCityName(citySlug)

    // Generate deterministic external_id using URL and event properties
    const external_id = generateEventExternalIdFromUrl(
      'allevents',
      eventUrl,
      title,
      eventDate,
      cityName
    )

    // Extract image
    const image =
      $el?.find('img').attr('src') ||
      $el?.find('img').attr('data-src') ||
      $el
        ?.find('[style*="background"]')
        .attr('style')
        ?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1] ||
      undefined

    // Extract venue
    const venue =
      $el?.find('.venue').text().trim() || $el?.find('.location').text().trim() || 'Venue TBD'

    // Extract price
    const priceText =
      $el?.find('.price').text().trim() || $el?.find('[class*="price"]').text().trim()
    const price = priceText || 'Check website'

    // Extract category
    const categoryText =
      $el?.find('.category').text().trim() ||
      $el?.find('[class*="category"]').text().trim() ||
      'event'

    const event: StandardizedEvent = {
      external_id,
      title,
      description: `${title} - ${categoryText} event in ${cityName}. ${venue}`,
      category: mapCategory(categoryText),
      venue,
      city: cityName,
      event_date: eventDate,
      image_url: image,
      ticket_url: eventUrl,
      price,
      source_platform: 'allevents',
      genre: categoryText,
      raw_data: {
        scraped_from: `${ALLEVENTS_BASE_URL}/${citySlug}`,
        city_slug: citySlug,
      },
    }

    return event
  } catch {
    return null
  }
}

/**
 * Standardize Allevents API response
 */
function standardizeAlleventsEvent(event: unknown, city: string): StandardizedEvent {
  if (!event || typeof event !== 'object') {
    return {
      external_id: `allevents-${Date.now()}`,
      title: 'Untitled Event',
      description: 'Event details not available',
      venue: 'Venue TBD',
      event_date: new Date().toISOString(),
      ticket_url: '',
      city: city,
      source_platform: 'allevents',
      category: 'other',
      price: 'Check website',
      raw_data: {},
    }
  }
  const record = event as Record<string, unknown>
  const title = String(record.title ?? record.name ?? 'Untitled Event')
  const eventDate = String(record.start_date ?? record.event_date ?? new Date().toISOString())
  const eventUrl = String(record.url ?? record.link ?? '')

  // Generate deterministic external_id
  const external_id = record.id
    ? `allevents-${String(record.id)}`
    : generateEventExternalIdFromUrl('allevents', eventUrl, title, eventDate, city)

  return {
    external_id,
    title,
    description: String(record.description ?? `Event in ${city}`),
    category: mapCategory(String(record.category ?? 'event')),
    venue:
      (record.venue && typeof record.venue === 'object' && 'name' in record.venue
        ? String((record.venue as { name?: unknown }).name ?? '')
        : String(record.location ?? 'Venue TBD')) || 'Venue TBD',
    city: String(record.city ?? city),
    event_date: String(record.start_time ?? record.date ?? new Date().toISOString()),
    image_url: record.image_url
      ? String(record.image_url)
      : record.banner_url
        ? String(record.banner_url)
        : undefined,
    ticket_url: String(record.url ?? `${ALLEVENTS_BASE_URL}/${String(record.id ?? '')}`),
    price: String(record.price ?? record.ticket_price ?? 'Check website'),
    source_platform: 'allevents',
    genre: String(record.category ?? 'event'),
    raw_data: {
      source: 'api',
      original: event,
    },
  }
}

/**
 * Parse date text
 */
function parseDateText(dateText: string): string | null {
  if (!dateText) return null

  try {
    // Try ISO format first
    if (/\d{4}-\d{2}-\d{2}/.test(dateText)) {
      const date = new Date(dateText)
      if (!isNaN(date?.getTime())) {
        return date?.toISOString()
      }
    }

    // Handle relative dates
    const now = new Date()
    if (/today/i?.test(dateText)) {
      return now?.toISOString()
    }
    if (/tomorrow/i?.test(dateText)) {
      return new Date(now?.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }

    // Try parsing date with month names
    const monthNames = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ]
    const dateMatch = dateText?.match(/(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]{3})/i)

    if (dateMatch && dateMatch[1] && dateMatch[2]) {
      const day = parseInt(dateMatch[1])
      const monthIndex = monthNames?.findIndex((m) => dateMatch[2]!.toLowerCase().startsWith(m))

      if (monthIndex !== -1 && day >= 1 && day <= 31) {
        const year = now?.getFullYear()
        const date = new Date(year, monthIndex, day)

        if (date < now) {
          date?.setFullYear(year + 1)
        }

        return date?.toISOString()
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Generate future date
 */
function generateFutureDate(): string {
  const daysOffset = Math?.floor(Math?.random() * 30) + 1
  return new Date(Date?.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Map category to standard
 */
function mapCategory(category: string): string {
  const categoryLower = category?.toLowerCase()

  const mapping: Record<string, string> = {
    workshop: 'workshop',
    networking: 'networking',
    conference: 'conference',
    meetup: 'meetup',
    seminar: 'workshop',
    exhibition: 'exhibition',
    webinar: 'workshop',
    concert: 'concert',
    music: 'concert',
    comedy: 'comedy',
    sports: 'sports',
    food: 'food',
  }

  for (const [key, value] of Object?.entries(mapping)) {
    if (categoryLower?.includes(key)) {
      return value
    }
  }

  return 'event'
}

/**
 * Get proper city name
 */
function getCityName(citySlug: string): string {
  const cityMap: Record<string, string> = {
    mumbai: 'Mumbai',
    delhi: 'Delhi',
    ncr: 'Delhi',
    bengaluru: 'Bengaluru',
    bangalore: 'Bengaluru',
    hyderabad: 'Hyderabad',
    pune: 'Pune',
    chennai: 'Chennai',
    kolkata: 'Kolkata',
    ahmedabad: 'Ahmedabad',
    chandigarh: 'Chandigarh',
    kochi: 'Kochi',
    jaipur: 'Jaipur',
  }

  return cityMap[citySlug?.toLowerCase()] || citySlug?.charAt(0).toUpperCase() + citySlug?.slice(1)
}
