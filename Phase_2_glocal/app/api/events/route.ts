import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchBookMyShowEvents } from '@/lib/integrations/bookmyshow'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/events - List events (BookMyShow + Artist events)
 *
 * @param request - Next.js request with query parameters
 * @returns List of events with metadata
 */
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events')

  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'Mumbai'
    const category = searchParams.get('category') || 'all'
    const dateFilter = searchParams.get('date') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = await createClient()

    // Fetch artist/community events from database
    let dbQuery = supabase
      .from('events')
      .select('*')
      .eq('city', city)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(limit)

    if (category !== 'all') {
      dbQuery = dbQuery.eq('category', category)
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

    logger.info('Fetching events', { city, category, dateFilter, limit })

    const { data: dbEvents } = await dbQuery

    // Fetch BookMyShow events (cached for 6 hours)
    const bmsEvents = await fetchBookMyShowEvents(city, category, Math.floor(limit / 2))

    // Transform and merge events
    const transformedBmsEvents = bmsEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      venue: event.venue,
      city: event.city,
      event_date: event.eventDate,
      image_url: event.imageUrl,
      ticket_url: event.ticketUrl,
      source: 'bookmyshow' as const,
      price: event.price,
    }))

    const transformedDbEvents = (dbEvents || []).map((event) => ({
      ...event,
      source: event.source || 'artist',
    }))

    // Merge and sort by date
    const allEvents = [...transformedBmsEvents, ...transformedDbEvents].sort((a, b) => {
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    })

    logger.info('Events fetched successfully', {
      totalCount: allEvents.length,
      bmsCount: transformedBmsEvents.length,
      dbCount: transformedDbEvents.length,
    })

    return createSuccessResponse(allEvents.slice(0, limit), {
      city,
      category,
      dateFilter,
      sources: {
        bookmyshow: transformedBmsEvents.length,
        database: transformedDbEvents.length,
      },
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/events',
    })
  }
})

/**
 * POST /api/events - Create event (for artists with active/trial subscription)
 *
 * @param request - Next.js request with event data
 * @returns Created event
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/events')

  try {
    const body = await request.json()
    const {
      title,
      description,
      event_date,
      location_city,
      location_address,
      category,
      ticket_info,
    } = body

    if (!title || !event_date || !location_city || !category) {
      throw APIErrors.badRequest('title, event_date, location_city, and category are required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Creating event', {
      userId: user.id,
      title: title.substring(0, 50),
      location_city,
      category,
    })

    // Verify user is an artist with active or trial subscription
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, subscription_status, subscription_end_date')
      .eq('user_id', user.id)
      .single()

    if (artistError || !artist) {
      throw APIErrors.forbidden()
    }

    // Validate subscription status: must be trial or active
    if (!['trial', 'active'].includes(artist.subscription_status)) {
      throw APIErrors.forbidden()
    }

    // Validate event date is in the future
    const eventDate = new Date(event_date)
    if (eventDate <= new Date()) {
      throw APIErrors.badRequest('Event date must be in the future')
    }

    // Create event
    const { data: event, error: createError } = await supabase
      .from('events')
      .insert({
        artist_id: artist.id,
        title,
        description,
        event_date,
        location_city,
        location_address,
        category,
        ticket_info,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    logger.info('Event created successfully', {
      eventId: event.id,
      userId: user.id,
      artistId: artist.id,
    })

    return createSuccessResponse(event, {
      message: 'Event created successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/events',
    })
  }
})
