/**
 * Standardized event structure across all platforms
 *
 * Note: This is an internal interface used during event aggregation.
 * When saving to the database, `ticket_url` is mapped to `external_booking_url`
 * by the sync service (see lib/services/event-sync-service.ts).
 */
export interface StandardizedEvent {
  external_id: string
  title: string
  description: string
  category: string
  venue: string
  city: string
  event_date: string // ISO 8601 format
  image_url?: string
  ticket_url?: string // Mapped to external_booking_url when saving to DB
  price?: string
  source_platform:
    | 'eventbrite'
    | 'insider'
    | 'allevents'
    | 'paytm-insider'
    | 'townscript'
    | 'explara'
    | 'meetup'
    | 'google-events'
  raw_data: Record<string, unknown>
  language?: string
  duration?: string
  genre?: string
}

/**
 * Result from platform fetch operation
 */
export interface PlatformFetchResult {
  platform: string
  success: boolean
  events: StandardizedEvent[]
  error?: string
  fetchedAt: string
}

/**
 * Configuration for event fetching
 */
export interface FetchConfig {
  city: string
  category?: string
  limit?: number
  startDate?: Date
  endDate?: Date
}
