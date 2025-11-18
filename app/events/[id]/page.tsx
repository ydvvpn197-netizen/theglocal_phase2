import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, ExternalLink, Clock, Tag } from 'lucide-react'
import { RsvpButton } from '@/components/events/rsvp-button'

interface EventDetailPageProps {
  params: { id: string }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const supabase = await createClient()

  // Fetch event
  const { data: event, error } = await supabase
    .from('events')
    .select(
      `
      *,
      artist:artists(stage_name, user_id)
    `
    )
    .eq('id', params.id)
    .single()

  if (error || !event) {
    return notFound()
  }

  // Get RSVP count
  const { count: rsvpCount } = await supabase
    .from('event_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', params.id)

  // Check if current user has RSVP'd
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRsvp = false
  if (user) {
    const { data: rsvp } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', params.id)
      .eq('user_id', user.id)
      .single()

    userRsvp = !!rsvp
  }

  const eventDate = new Date(event.event_date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        {/* Event Image */}
        {event.image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <Image src={event.image_url} alt={event.title} fill className="object-cover" />
          </div>
        )}

        {/* Event Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {event.category}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {event.source || 'artist'}
            </Badge>
          </div>

          <h1 className="text-3xl font-bold">{event.title}</h1>

          {event.artist && (
            <p className="text-muted-foreground">
              Organized by <span className="font-medium">{event.artist.stage_name}</span>
            </p>
          )}
        </div>

        {/* Event Details */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{formattedDate}</div>
                <div className="text-sm text-muted-foreground">{formattedTime}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{event.venue}</div>
                <div className="text-sm text-muted-foreground">{event.city}</div>
              </div>
            </div>

            {event.price && (
              <div className="flex items-start gap-3">
                <Tag className="mt-1 h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{event.price}</div>
                  <div className="text-sm text-muted-foreground">Ticket Price</div>
                </div>
              </div>
            )}

            {event.duration && (
              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-5 w-5 text-muted-foreground" />
                <div className="font-medium">{event.duration}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {event.description && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 text-xl font-semibold">About This Event</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">{event.description}</p>
            </CardContent>
          </Card>
        )}

        {/* RSVP / Ticket Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  {rsvpCount || 0} people interested
                </div>
              </div>

              <div className="flex gap-2">
                {event.source === 'bookmyshow' && event.ticket_url ? (
                  <Button asChild>
                    <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Book on BookMyShow
                    </a>
                  </Button>
                ) : (
                  <RsvpButton
                    eventId={params.id}
                    initialRsvp={userRsvp}
                    initialCount={rsvpCount || 0}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('title, description')
    .eq('id', params.id)
    .single()

  if (!event) {
    return {
      title: 'Event Not Found',
    }
  }

  return {
    title: event.title,
    description: event.description?.slice(0, 160),
  }
}
