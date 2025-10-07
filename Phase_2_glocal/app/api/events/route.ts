import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchBookMyShowEvents } from '@/lib/integrations/bookmyshow'

// GET /api/events - List events (BookMyShow + Artist events)
export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      data: allEvents.slice(0, limit),
      meta: {
        city,
        category,
        dateFilter,
        sources: {
          bookmyshow: transformedBmsEvents.length,
          database: transformedDbEvents.length,
        },
      },
    })
  } catch (error) {
    console.error('Fetch events error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      },
      { status: 500 }
    )
  }
}

// POST /api/events - Create event (for artists)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, event_date, venue, city, category, ticket_url, price } = body

    if (!title || !event_date || !venue || !city) {
      return NextResponse.json(
        { error: 'title, event_date, venue, and city are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify user is an artist with active subscription
    const { data: artist } = await supabase
      .from('artists')
      .select('id, subscription_status')
      .eq('user_id', user.id)
      .single()

    if (!artist) {
      return NextResponse.json({ error: 'Artist profile required' }, { status: 403 })
    }

    if (artist.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required to create events' },
        { status: 403 }
      )
    }

    // Create event
    const { data: event, error: createError } = await supabase
      .from('events')
      .insert({
        artist_id: artist.id,
        title,
        description,
        event_date,
        venue,
        city,
        category,
        ticket_url,
        price,
        source: 'artist',
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
      data: event,
    })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create event',
      },
      { status: 500 }
    )
  }
}
