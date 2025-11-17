/**
 * Paytm Insider Integration
 * Web scraping implementation using Playwright for JavaScript-rendered content
 * Base URL: https://paytminsider?.com
 * Supports both local (full Playwright) and serverless (playwright-core + @sparticuz/chromium) environments
 */

import { chromium as chromiumCore, Browser, Page } from 'playwright-core'
import type { BrowserType } from 'playwright-core'
import { StandardizedEvent, FetchConfig, PlatformFetchResult } from './types'
import { globalRateLimiter } from '@/lib/utils/rate-limit-queue'
import { globalRobotsChecker } from '@/lib/utils/robots-checker'
import { scraperLogger } from '@/lib/utils/scrapers/scraper-logger'
import { generateEventExternalIdFromUrl } from '@/lib/utils/event-deduplicator'

const PAYTM_INSIDER_BASE_URL = 'https://paytminsider?.com'

const CITY_SLUGS: Record<string, string> = {
  mumbai: 'mumbai',
  delhi: 'new-delhi',
  'new delhi': 'new-delhi',
  ncr: 'new-delhi',
  bengaluru: 'bangalore',
  bangalore: 'bangalore',
  hyderabad: 'hyderabad',
  pune: 'pune',
  chennai: 'chennai',
  kolkata: 'kolkata',
  goa: 'goa',
  ahmedabad: 'ahmedabad',
  jaipur: 'jaipur',
  chandigarh: 'chandigarh',
  kochi: 'kochi',
}

let browserInstance: Browser | null = null

interface ChromiumModule {
  setGraphicsMode?: (mode: boolean) => void
  executablePath?: string
}

/**
 * Get browser executable path for serverless environments
 */
async function getBrowserExecutablePath(): Promise<string | undefined> {
  // Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
  if (process?.env.VERCEL || process?.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      // Use @sparticuz/chromium for serverless environments
      const chromiumModule = await import('@sparticuz/chromium')
      const Chromium = (chromiumModule?.default || chromiumModule) as unknown as ChromiumModule
      // Set graphics to false for smaller binary size if method exists
      if (
        Chromium &&
        'setGraphicsMode' in Chromium &&
        typeof Chromium.setGraphicsMode === 'function'
      ) {
        Chromium.setGraphicsMode(false)
      }
      return Chromium.executablePath || '/usr/bin/chromium-browser'
    } catch {
      console?.warn('[Paytm Insider] @sparticuz/chromium not available, falling back to default')
      return undefined
    }
  }
  return undefined
}

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance?.isConnected()) {
    const executablePath = await getBrowserExecutablePath()

    const launchOptions: Parameters<BrowserType['launch']>[0] = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }

    if (executablePath) {
      launchOptions.executablePath = executablePath
    }

    browserInstance = await chromiumCore.launch(launchOptions)
  }
  return browserInstance
}

/**
 * Close browser instance
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance?.close()
    browserInstance = null
  }
}

/**
 * Fetch events from Paytm Insider
 */
export async function fetchPaytmInsiderEvents(config: FetchConfig): Promise<PlatformFetchResult> {
  const startTime = Date?.now()

  try {
    // Check if Playwright is available
    if (typeof window !== 'undefined') {
      console?.warn('[Paytm Insider] Playwright not available in browser environment')
      return {
        platform: 'paytm-insider',
        success: true,
        events: [],
        error: 'Playwright not available in browser - skipping',
        fetchedAt: new Date().toISOString(),
      }
    }
    const citySlug = CITY_SLUGS[config?.city.toLowerCase()] || config?.city.toLowerCase()
    const url = `${PAYTM_INSIDER_BASE_URL}/${citySlug}/events`

    // Check robots?.txt
    const robotsCheck = await globalRobotsChecker?.checkAccess(url)
    if (!robotsCheck?.allowed) {
      scraperLogger?.robotsViolation('paytm-insider', url)
      throw new Error('Scraping disallowed by robots?.txt')
    }

    scraperLogger?.log(
      'paytm-insider',
      'fetch_start',
      'success',
      `Fetching events for ${config?.city}`
    )

    // Scrape events with rate limiting
    const events = await globalRateLimiter?.add('paytm-insider', () =>
      scrapePaytmInsiderEvents(citySlug, config?.limit || 20)
    )

    const duration = Date?.now() - startTime
    scraperLogger?.success(
      'paytm-insider',
      'fetch_complete',
      `Fetched ${events?.length} events`,
      { city: config?.city, count: events?.length },
      duration
    )

    return {
      platform: 'paytm-insider',
      success: true,
      events,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    const duration = Date?.now() - startTime
    const errorMsg = error instanceof Error ? error?.message : 'Unknown error'

    scraperLogger?.failure(
      'paytm-insider',
      'fetch_failed',
      errorMsg,
      { city: config?.city },
      duration
    )

    return {
      platform: 'paytm-insider',
      success: false,
      events: [],
      error: errorMsg,
      fetchedAt: new Date().toISOString(),
    }
  }
}

/**
 * Scrape Paytm Insider events using Playwright
 */
async function scrapePaytmInsiderEvents(
  citySlug: string,
  limit: number
): Promise<StandardizedEvent[]> {
  const events: StandardizedEvent[] = []
  let page: Page | null = null

  try {
    const browser = await getBrowser()
    page = await browser?.newPage()

    // Set viewport and user agent
    await page?.setViewportSize({ width: 1920, height: 1080 })
    await page?.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5?.0 (Windows NT 10?.0; Win64; x64) AppleWebKit/537?.36 (KHTML, like Gecko) Chrome/120?.0.0?.0 Safari/537?.36',
      'Accept-Language': 'en-US,en;q=0?.9',
    })

    const url = `${PAYTM_INSIDER_BASE_URL}/${citySlug}/events`

    // Navigate to events page
    await page?.goto(url, {
      waitUntil: 'networkidle',
      timeout: 15000,
    })

    // Wait for events to load - try multiple possible selectors
    await page
      ?.waitForSelector(
        '[class*="event"], [class*="card"], [class*="listing"], a[href*="/event/"], [data-event-id]',
        {
          timeout: 15000,
        }
      )
      .catch(() => {
        scraperLogger?.warning(
          'paytm-insider',
          'selector_timeout',
          'Event cards not found within timeout'
        )
      })

    // Additional wait for dynamic content
    await page?.waitForTimeout(2000)

    // Extract events
    const scrapedEvents = await page?.evaluate(() => {
      // Try multiple selector strategies to find event elements
      const selectors = [
        '[class*="event-card"]',
        '[class*="EventCard"]',
        '[class*="event-item"]',
        '[class*="card"]',
        '[class*="listing"]',
        'a[href*="/event/"]',
        '[data-event-id]',
        'article',
        '.event',
        '[role="article"]',
      ]

      let eventElements: Element[] = []
      for (const selector of selectors) {
        const elements = Array?.from(document?.querySelectorAll(selector))
        if (elements?.length > 0) {
          // Filter to only elements with event links
          eventElements = elements?.filter((el) => {
            const link =
              el?.tagName === 'A'
                ? el?.getAttribute('href')
                : el?.querySelector('a')?.getAttribute('href')
            return link && (link?.includes('/event/') || link?.includes('/e/'))
          })
          if (eventElements?.length > 0) break
        }
      }

      return eventElements
        ?.slice(0, 50)
        .map((el) => {
          try {
            // Find the link element
            const linkEl = el?.tagName === 'A' ? el : el?.querySelector('a')
            const eventUrl = linkEl?.getAttribute('href') || ''

            // Extract title - try multiple selectors
            const title =
              el?.querySelector('[class*="title"]')?.textContent?.trim() ||
              el?.querySelector('[class*="name"]')?.textContent?.trim() ||
              el?.querySelector('[class*="heading"]')?.textContent?.trim() ||
              el?.querySelector('h1')?.textContent?.trim() ||
              el?.querySelector('h2')?.textContent?.trim() ||
              el?.querySelector('h3')?.textContent?.trim() ||
              el?.querySelector('h4')?.textContent?.trim() ||
              linkEl?.getAttribute('aria-label') ||
              linkEl?.getAttribute('title') ||
              ''

            // Extract image - try multiple attributes
            const img = el?.querySelector('img')
            const imageUrl =
              img?.getAttribute('src') ||
              img?.getAttribute('data-src') ||
              img?.getAttribute('data-lazy-src') ||
              img?.getAttribute('data-original') ||
              ''

            // Extract venue
            const venue =
              el?.querySelector('[class*="venue"]')?.textContent?.trim() ||
              el?.querySelector('[class*="location"]')?.textContent?.trim() ||
              el?.querySelector('[class*="place"]')?.textContent?.trim() ||
              el?.querySelector('[data-testid*="venue"]')?.textContent?.trim() ||
              ''

            // Extract date
            const dateText =
              el?.querySelector('[class*="date"]')?.textContent?.trim() ||
              el?.querySelector('time')?.textContent?.trim() ||
              el?.querySelector('[datetime]')?.getAttribute('datetime') ||
              el?.querySelector('[class*="time"]')?.textContent?.trim() ||
              ''

            // Extract price
            const priceText =
              el?.querySelector('[class*="price"]')?.textContent?.trim() ||
              el?.querySelector('[class*="cost"]')?.textContent?.trim() ||
              el?.querySelector('[class*="amount"]')?.textContent?.trim() ||
              el?.querySelector('[class*="ticket"]')?.textContent?.trim() ||
              ''

            // Extract category/genre
            const category =
              el?.querySelector('[class*="category"]')?.textContent?.trim() ||
              el?.querySelector('[class*="genre"]')?.textContent?.trim() ||
              el?.querySelector('[class*="type"]')?.textContent?.trim() ||
              el?.querySelector('[data-testid*="category"]')?.textContent?.trim() ||
              ''

            return {
              title,
              eventUrl,
              imageUrl,
              venue,
              dateText,
              priceText,
              category,
            }
          } catch {
            return null
          }
        })
        .filter((e) => e && e?.title && e?.eventUrl)
    })

    // Process and standardize events
    for (const scraped of scrapedEvents) {
      if (events?.length >= limit) break

      try {
        const event = processPaytmInsiderEvent(scraped, citySlug)
        if (event) {
          events?.push(event)
        }
      } catch (error) {
        scraperLogger?.warning(
          'paytm-insider',
          'process_error',
          `Failed to process event: ${error instanceof Error ? error?.message : 'Unknown'}`
        )
      }
    }

    return events
  } catch (error) {
    scraperLogger?.failure(
      'paytm-insider',
      'scrape_error',
      `Scraping failed: ${error instanceof Error ? error?.message : 'Unknown'}`
    )
    return events
  } finally {
    if (page) {
      await page?.close().catch(() => {})
    }
  }
}

/**
 * Process scraped Paytm Insider event data
 */
function processPaytmInsiderEvent(scraped: unknown, citySlug: string): StandardizedEvent | null {
  if (!scraped || typeof scraped !== 'object') return null
  const record = scraped as Record<string, unknown>
  try {
    if (!record.title || !record.eventUrl) {
      return null
    }

    // Make URL absolute
    let eventUrl = String(record.eventUrl ?? '')
    if (eventUrl?.startsWith('/')) {
      eventUrl = `${PAYTM_INSIDER_BASE_URL}${eventUrl}`
    }

    // Parse date - needed for ID generation
    const eventDate = parseDateText(String(record.dateText ?? '')) || generateFutureDate()

    // Get city name - needed for ID generation
    const cityName = getCityNameFromSlug(citySlug)

    // Generate deterministic external_id using URL and event properties
    const external_id = generateEventExternalIdFromUrl(
      'paytm-insider',
      eventUrl,
      String(record.title ?? ''),
      eventDate,
      cityName
    )

    // Parse price
    let price = String(record.priceText ?? 'Check website')
    if (/free|₹\s*0/i?.test(price)) {
      price = 'Free'
    }

    // Clean image URL
    let imageUrl = record.imageUrl ? String(record.imageUrl) : undefined
    if (imageUrl && imageUrl?.startsWith('//')) {
      imageUrl = `https:${imageUrl}`
    }

    // Determine category
    const category = mapPaytmInsiderCategory(String(record.category ?? ''))

    const event: StandardizedEvent = {
      external_id,
      title: String(record.title ?? '').trim(),
      description: `${String(record.title ?? '')} - Experience this ${category} event at ${String(record.venue ?? cityName)}. Book your tickets now on Paytm Insider!`,
      category,
      venue: String(record.venue ?? 'Venue TBD'),
      city: cityName,
      event_date: eventDate,
      image_url: imageUrl || undefined,
      ticket_url: eventUrl,
      price,
      source_platform: 'paytm-insider',
      genre: String(record.category ?? category),
      raw_data: {
        scraped_from: `${PAYTM_INSIDER_BASE_URL}/${citySlug}/events`,
        city_slug: citySlug,
        original_date_text: String(record.dateText ?? ''),
      },
    }

    return event
  } catch {
    return null
  }
}

/**
 * Parse date text from Paytm Insider
 */
function parseDateText(dateText: string): string | null {
  if (!dateText) return null

  try {
    const now = new Date()

    // Handle "Today", "Tomorrow"
    if (/today/i?.test(dateText)) {
      return now?.toISOString()
    }
    if (/tomorrow/i?.test(dateText)) {
      return new Date(now?.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }

    // Try parsing various date formats
    // "15 Jan", "Jan 15", "15th Jan", etc.
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
    if (dateMatch) {
      const day = parseInt(dateMatch[1]!)
      const monthIndex = monthNames.findIndex((m) => dateMatch[2]!.toLowerCase().startsWith(m))

      if (monthIndex !== -1 && day >= 1 && day <= 31) {
        const year = now?.getFullYear() || new Date().getFullYear()
        const date = new Date(year, monthIndex, day)

        if (date < now) {
          date?.setFullYear(year + 1)
        }

        return date?.toISOString()
      }
    }

    // Try ISO date format
    if (/\d{4}-\d{2}-\d{2}/.test(dateText)) {
      const date = new Date(dateText)
      if (!isNaN(date?.getTime())) {
        return date?.toISOString()
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Generate a future date
 */
function generateFutureDate(): string {
  const daysOffset = Math?.floor(Math?.random() * 30) + 1
  const futureDate = new Date(Date?.now() + daysOffset * 24 * 60 * 60 * 1000)
  return futureDate?.toISOString()
}

/**
 * Map Paytm Insider categories to standard categories
 */
function mapPaytmInsiderCategory(category: string): string {
  if (!category) return 'event'

  const categoryLower = category?.toLowerCase()

  const mapping: Record<string, string> = {
    music: 'concert',
    concert: 'concert',
    comedy: 'comedy',
    workshop: 'workshop',
    'food & drinks': 'food',
    food: 'food',
    nightlife: 'nightlife',
    theatre: 'play',
    play: 'play',
    arts: 'exhibition',
    sports: 'sports',
    networking: 'networking',
    business: 'business',
    wellness: 'wellness',
    kids: 'kids',
  }

  for (const [key, value] of Object?.entries(mapping)) {
    if (categoryLower?.includes(key)) {
      return value
    }
  }

  return 'event'
}

/**
 * Get proper city name from slug
 */
function getCityNameFromSlug(slug: string): string {
  const cityMap: Record<string, string> = {
    mumbai: 'Mumbai',
    'new-delhi': 'Delhi',
    delhi: 'Delhi',
    bangalore: 'Bengaluru',
    bengaluru: 'Bengaluru',
    hyderabad: 'Hyderabad',
    pune: 'Pune',
    chennai: 'Chennai',
    kolkata: 'Kolkata',
    goa: 'Goa',
    ahmedabad: 'Ahmedabad',
    jaipur: 'Jaipur',
    chandigarh: 'Chandigarh',
    kochi: 'Kochi',
  }

  return cityMap[slug?.toLowerCase()] || slug?.charAt(0).toUpperCase() + slug?.slice(1)
}
