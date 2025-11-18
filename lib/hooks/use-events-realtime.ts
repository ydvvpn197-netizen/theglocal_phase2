/**
 * Hook to subscribe to real-time updates for events feed
 *
 * Handles INSERT, UPDATE, and DELETE events on events table.
 * Uses the generic useRealtimeSubscription factory for connection management.
 */

'use client'

import { useRealtimeSubscription } from '@/lib/hooks/use-realtime-subscription'
import { EventRow } from '@/lib/types/realtime.types'
import { isEventPayload } from '@/lib/types/type-guards'
import { generateSubscriptionKey } from '@/lib/utils/realtime-connection-manager'
import { logger } from '@/lib/utils/logger'

interface EventData {
  id: string
  title: string
  description: string | null
  category: string
  venue: string | null
  city: string
  event_date: string
  image_url?: string | null
  external_booking_url?: string | null
  source:
    | 'eventbrite'
    | 'insider'
    | 'allevents'
    | 'paytm-insider'
    | 'meetup'
    | 'artist'
    | 'community'
  source_platform?: string | null
  price?: string | null
  rsvp_count?: number
  artist_id?: string | null
  location_address?: string | null
  location_coordinates?: string | null
  ticket_info?: string | null
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

interface UseEventsRealtimeProps {
  city?: string
  category?: string
  dateFilter?: string
  source?: string
  onNewEvent?: (event: EventData) => void
  onEventUpdate?: (eventId: string, updates: Partial<EventData>) => void
  onEventDelete?: (eventId: string) => void
}

interface UseEventsRealtimeResult {
  isConnected: boolean
  error: string | null
}

/**
 * Hook to subscribe to real-time updates for events feed
 * Handles INSERT, UPDATE, and DELETE events on events table
 *
 * This version uses the generic useRealtimeSubscription factory
 */
export function useEventsRealtime({
  city,
  category,
  dateFilter,
  source,
  onNewEvent,
  onEventUpdate,
  onEventDelete,
}: UseEventsRealtimeProps): UseEventsRealtimeResult {
  const filterKey = [city || 'all', category || 'all', dateFilter || 'all', source || 'all'].join(
    '-'
  )
  const subscriptionKey = generateSubscriptionKey('events', filterKey)

  // Helper to transform EventRow to EventData
  const transformEvent = (event: EventRow): EventData => ({
    id: event.id,
    title: event.title,
    description: event.description || null,
    category: event.category || 'general',
    venue: event.venue || event.location_address || null,
    city: event.location_city,
    event_date: event.event_date,
    image_url: event.image_url || null,
    external_booking_url: event.external_booking_url || null,
    source: (event.source_platform || event.source || 'artist') as EventData['source'],
    source_platform: event.source_platform || event.source,
    price: event.ticket_info || event.price || null,
    rsvp_count: event.rsvp_count || 0,
    artist_id: event.artist_id || null,
    location_address: event.location_address || null,
    location_coordinates: event.location_coordinates || null,
    ticket_info: event.ticket_info || null,
    expires_at: event.expires_at || null,
    created_at: event.created_at,
    updated_at: event.updated_at,
  })

  // Helper to check if event should be included based on filters
  const shouldIncludeEvent = (event: EventRow): boolean => {
    // Skip if event is in the past or expired
    const eventDate = new Date(event.event_date)
    const expiresAt = event.expires_at ? new Date(event.expires_at) : null
    const now = new Date()

    if (eventDate < now || (expiresAt && expiresAt < now)) {
      logger.info('⏭️ Skipping past/expired event:', event.id)
      return false
    }

    // Apply city filter
    if (city && city !== 'all' && event.location_city?.toLowerCase() !== city.toLowerCase()) {
      return false
    }

    // Apply category filter
    if (category && category !== 'all' && event.category !== category) {
      return false
    }

    // Apply source filter
    if (source && source !== 'all') {
      const eventSource = event.source_platform || event.source
      if (eventSource !== source) {
        return false
      }
    }

    // Apply date filter
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'today') {
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)
        if (eventDate > endOfDay) return false
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const endOfTomorrow = new Date(tomorrow)
        endOfTomorrow.setHours(23, 59, 59, 999)
        if (eventDate < tomorrow || eventDate > endOfTomorrow) return false
      } else if (dateFilter === 'this-week') {
        const endOfWeek = new Date(now)
        endOfWeek.setDate(endOfWeek.getDate() + 7)
        if (eventDate > endOfWeek) return false
      } else if (dateFilter === 'this-month') {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        if (eventDate > endOfMonth) return false
      }
    }

    return true
  }

  const { isConnected, error } = useRealtimeSubscription<EventRow>({
    table: 'events',
    subscriptionKey,
    onInsert: (event) => {
      if (shouldIncludeEvent(event)) {
        const transformed = transformEvent(event)
        onNewEvent?.(transformed)
      }
    },
    onUpdate: (id, updates) => {
      // For updates, we need the full event to check filters
      // This is a limitation - we'd need to fetch the full event or pass it through
      // For now, we'll call the callback if provided
      if (onEventUpdate) {
        // Transform partial updates
        const partialUpdates: Partial<EventData> = {
          ...(updates.title && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.category && { category: updates.category }),
          // Add other fields as needed
        }
        onEventUpdate(id, partialUpdates)
      }
    },
    onDelete: (id) => {
      onEventDelete?.(id)
    },
    transformPayload: (payload) => {
      if (isEventPayload(payload) && payload.new) {
        return payload.new as EventRow
      }
      throw new Error('Invalid event payload')
    },
    validatePayload: (payload) => {
      return isEventPayload(payload) && !!payload.new
    },
    dependencies: [city, category, dateFilter, source],
  })

  return { isConnected, error }
}
