/**
 * Event Deduplicator
 *
 * Generates consistent external_id values for events to prevent duplicates
 * Uses deterministic hashing based on event properties
 */

import crypto from 'crypto'

/**
 * Generate a deterministic external ID for an event
 * Based on: platform + title + event_date + city
 */
export function generateEventExternalId(
  platform: string,
  title: string,
  eventDate: string | Date,
  city: string
): string {
  // Normalize inputs to ensure consistency
  const normalizedTitle = normalizeString(title)
  const normalizedCity = normalizeString(city)
  const dateStr = typeof eventDate === 'string' ? eventDate : eventDate.toISOString()
  const dateOnly = dateStr.split('T')[0] // Get YYYY-MM-DD

  // Create a hash of the combined properties
  const hash = crypto
    .createHash('md5')
    .update(`${normalizedTitle}-${dateOnly}-${normalizedCity}`)
    .digest('hex')
    .substring(0, 12) // Use first 12 characters

  // Create readable slug from title (max 30 chars)
  const titleSlug = createSlug(title, 30)

  return `${platform}-${titleSlug}-${hash}`
}

/**
 * Alternative: Generate ID from URL slug if available
 * Falls back to property-based ID generation
 */
export function generateEventExternalIdFromUrl(
  platform: string,
  url: string,
  title: string,
  eventDate: string | Date,
  city: string
): string {
  // Try to extract ID from URL patterns
  const patterns = [
    /\/events\/([a-zA-Z0-9-_]+)/,
    /\/event\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/([a-zA-Z0-9-_]+)$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1] && match[1].length > 5) {
      // Valid ID found in URL
      return `${platform}-${match[1]}`
    }
  }

  // Fallback to property-based ID
  return generateEventExternalId(platform, title, eventDate, city)
}

/**
 * Normalize string for consistent comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
}

/**
 * Create URL-friendly slug from text
 */
function createSlug(text: string, maxLength: number = 50): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-+|-+$/g, '') // Trim hyphens from start/end

  return slug.substring(0, maxLength)
}

/**
 * Check if two events are likely duplicates based on properties
 */
export function areEventsDuplicate(
  event1: {
    title: string
    event_date: string | Date
    city: string
    source_platform: string
  },
  event2: {
    title: string
    event_date: string | Date
    city: string
    source_platform: string
  }
): boolean {
  // Must be from same platform
  if (event1.source_platform !== event2.source_platform) {
    return false
  }

  // Normalize titles for comparison
  const title1 = normalizeString(event1.title)
  const title2 = normalizeString(event2.title)

  // Check title similarity (exact match after normalization)
  if (title1 !== title2) {
    return false
  }

  // Check date (same day)
  const date1 =
    typeof event1.event_date === 'string'
      ? event1.event_date.split('T')[0]
      : event1.event_date.toISOString().split('T')[0]
  const date2 =
    typeof event2.event_date === 'string'
      ? event2.event_date.split('T')[0]
      : event2.event_date.toISOString().split('T')[0]

  if (date1 !== date2) {
    return false
  }

  // Check city
  const city1 = normalizeString(event1.city)
  const city2 = normalizeString(event2.city)

  return city1 === city2
}
