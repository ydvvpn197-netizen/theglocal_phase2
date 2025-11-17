import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/events - List events with proximity search support
 *
 * Query params:
 * - lat, lng, radius: Proximity search (returns distance_km)
 * - city: Fallback city filter if no coordinates provided
 * - category: Filter by event category
 * - source: Filter by source (artist, bookmyshow, eventbrite, etc.)
 * - date: Filter by date (today, tomorrow, this-week, this-month, all)
 * - limit, offset: Pagination
 *
 * Response includes distance_km when lat/lng provided
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/v2/events')
  try {
    const searchParams = _request.nextUrl.searchParams

    // Location parameters
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseFloat(searchParams.get('radius') || '25')
    const city = searchParams.get('city') || 'Mumbai'

    // Filter parameters
    const category = searchParams.get('category') || 'all'
    const dateFilter = searchParams.get('date') || 'all'
    const source = searchParams.get('source') || 'all'
    const limit = parseInt(searchParams.get('limit') || '24')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    let data: unknown[] = []
    let error: Error | null = null
    let totalCount = 0

    // Strategy 1: Proximity search if coordinates provided
    if (lat && lng) {
      const { data: proximityData, error: proximityError } = await supabase.rpc(
        'get_events_within_radius',
        {
          user_lat: parseFloat(lat),
          user_lng: parseFloat(lng),
          radius_km: radius,
          category_filter: category !== 'all' ? category : null,
          source_filter: source !== 'all' ? source : null,
          limit_count: 200, // Get more for client-side filtering
        }
      )

      if (proximityError) {
        logger.error(
          'Proximity search error:',
          proximityError instanceof Error ? proximityError : undefined
        )
        throw proximityError
      }

      data = proximityData || []

      // Apply date filter client-side
      data = applyDateFilter(data, dateFilter)

      totalCount = data.length

      // Apply pagination
      data = data.slice(offset, offset + limit)
    }
    // Strategy 2: City/standard filter fallback
    else {
      let dbQuery = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .gte('event_date', new Date().toISOString())
        .gt('expires_at', new Date().toISOString())
        .order('event_date', { ascending: true })

      // Apply city filter if provided and not 'all'
      if (city && city !== 'all') {
        dbQuery = dbQuery.ilike('location_city', city)
      }

      if (category !== 'all') {
        dbQuery = dbQuery.eq('category', category)
      }

      if (source !== 'all') {
        dbQuery = dbQuery.or(`source.eq.${source},source_platform.eq.${source}`)
      }

      // Apply date filters
      const now = new Date()
      if (dateFilter === 'today') {
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)
        dbQuery = dbQuery.lte('event_date', endOfDay.toISOString())
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const endOfTomorrow = new Date(tomorrow)
        endOfTomorrow.setHours(23, 59, 59, 999)
        dbQuery = dbQuery
          .gte('event_date', tomorrow.toISOString())
          .lte('event_date', endOfTomorrow.toISOString())
      } else if (dateFilter === 'this-week') {
        const endOfWeek = new Date(now)
        endOfWeek.setDate(endOfWeek.getDate() + 7)
        dbQuery = dbQuery.lte('event_date', endOfWeek.toISOString())
      } else if (dateFilter === 'this-month') {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        dbQuery = dbQuery.lte('event_date', endOfMonth.toISOString())
      }

      // Apply pagination
      dbQuery = dbQuery.range(offset, offset + limit - 1)

      const { data: dbData, error: dbError, count } = await dbQuery

      data = dbData || []
      error = dbError
      totalCount = count || 0
    }

    if (error) throw error

    // Transform events to consistent format
    interface EventData {
      id: string
      title: string
      description: string | null
      category: string | null
      venue?: string | null
      location_address?: string | null
      location_city: string | null
      event_date: string
      image_url: string | null
      external_booking_url: string | null
      source_platform?: string | null
      source?: string | null
      ticket_info?: Record<string, unknown> | null
      price?: string | null
      rsvp_count?: number
      artist_id?: string | null
      distance_km?: number
    }

    const transformedEvents = (data as EventData[]).map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      venue: event.venue || event.location_address,
      city: event.location_city,
      event_date: event.event_date,
      image_url: event.image_url,
      external_booking_url: event.external_booking_url,
      source: event.source_platform || event.source || 'artist',
      source_platform: event.source_platform || event.source,
      price: event.ticket_info || event.price,
      rsvp_count: event.rsvp_count,
      artist_id: event.artist_id,
      distance_km: event.distance_km, // Available from proximity search
    }))

    const hasMore =
      lat && lng
        ? offset + transformedEvents.length < totalCount
        : transformedEvents.length === limit

    return NextResponse.json({
      success: true,
      data: transformedEvents,
      meta: {
        count: transformedEvents.length,
        total: totalCount,
        offset,
        limit,
        hasMore,
        filters: {
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          radius,
          city,
          category,
          dateFilter,
          source,
        },
        hasProximitySearch: !!(lat && lng),
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/events' })
  }
})
/**
 * Apply date filter to events array
 */
function applyDateFilter(events: unknown[], dateFilter: string): unknown[] {
  if (dateFilter === 'all') return events

  const now = new Date()

  interface EventWithDate {
    event_date: string
    [key: string]: unknown
  }

  return (events as EventWithDate[]).filter((event) => {
    const eventDate = new Date(event.event_date)

    if (dateFilter === 'today') {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return eventDate >= now && eventDate <= endOfDay
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const endOfTomorrow = new Date(tomorrow)
      endOfTomorrow.setHours(23, 59, 59, 999)
      return eventDate >= tomorrow && eventDate <= endOfTomorrow
    } else if (dateFilter === 'this-week') {
      const endOfWeek = new Date(now)
      endOfWeek.setDate(endOfWeek.getDate() + 7)
      return eventDate >= now && eventDate <= endOfWeek
    } else if (dateFilter === 'this-month') {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      endOfMonth.setHours(23, 59, 59, 999)
      return eventDate >= now && eventDate <= endOfMonth
    }

    return true
  })
}
