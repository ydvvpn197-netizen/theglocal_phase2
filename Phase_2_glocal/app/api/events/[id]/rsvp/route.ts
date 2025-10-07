import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: eventId } = params

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if event exists
    const { data: event } = await supabase
      .from('events')
      .select('id, event_date')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is in the future
    if (new Date(event.event_date) < new Date()) {
      return NextResponse.json({ error: 'Cannot RSVP to past events' }, { status: 400 })
    }

    // Check if user already RSVP'd
    const { data: existingRsvp } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (existingRsvp) {
      return NextResponse.json({ error: "You have already RSVP'd to this event" }, { status: 400 })
    }

    // Create RSVP
    const { error: rsvpError } = await supabase.from('event_rsvps').insert({
      event_id: eventId,
      user_id: user.id,
    })

    if (rsvpError) throw rsvpError

    // Get updated RSVP count
    const { count } = await supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    return NextResponse.json({
      success: true,
      message: 'RSVP confirmed',
      data: {
        rsvp_count: count || 1,
      },
    })
  } catch (error) {
    console.error('RSVP error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to RSVP',
      },
      { status: 500 }
    )
  }
}
