import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events/[id] - Get event details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: event,
    })
  } catch (error) {
    console.error('Fetch event error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch event',
      },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id] - Update event (artist only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get event and verify ownership
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('artist_id')
      .eq('id', params.id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify user owns this event
    const { data: artist } = await supabase
      .from('artists')
      .select('id, subscription_status')
      .eq('user_id', user.id)
      .eq('id', event.artist_id)
      .single()

    if (!artist) {
      return NextResponse.json(
        { error: 'Unauthorized. You can only edit your own events.' },
        { status: 403 }
      )
    }

    // Check subscription status
    if (!['trial', 'active'].includes(artist.subscription_status)) {
      return NextResponse.json(
        { error: 'Active subscription required to edit events' },
        { status: 403 }
      )
    }

    // Validate event date is in the future (if provided)
    if (event_date) {
      const eventDate = new Date(event_date)
      if (eventDate <= new Date()) {
        return NextResponse.json({ error: 'Event date must be in the future' }, { status: 400 })
      }
    }

    // Update event
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (event_date !== undefined) updateData.event_date = event_date
    if (location_city !== undefined) updateData.location_city = location_city
    if (location_address !== undefined) updateData.location_address = location_address
    if (category !== undefined) updateData.category = category
    if (ticket_info !== undefined) updateData.ticket_info = ticket_info

    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent,
    })
  } catch (error) {
    console.error('Update event error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update event',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] - Delete event (artist only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get event and verify ownership
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('artist_id')
      .eq('id', params.id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify user owns this event
    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', event.artist_id)
      .single()

    if (!artist) {
      return NextResponse.json(
        { error: 'Unauthorized. You can only delete your own events.' },
        { status: 403 }
      )
    }

    // Delete event
    const { error: deleteError } = await supabase.from('events').delete().eq('id', params.id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete event',
      },
      { status: 500 }
    )
  }
}

