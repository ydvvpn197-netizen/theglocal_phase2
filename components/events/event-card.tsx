'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, ExternalLink, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useToast } from '@/lib/hooks/use-toast'

interface Event {
  id: string
  title: string
  description: string
  category: string
  venue: string
  city: string
  event_date: string
  image_url?: string
  ticket_url?: string
  source: 'bookmyshow' | 'artist' | 'community'
  artist_id?: string
  price?: string
  rsvp_count?: number
  user_rsvp?: boolean
}

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isRsvping, setIsRsvping] = useState(false)
  const [hasRsvp, setHasRsvp] = useState(event.user_rsvp || false)
  const [rsvpCount, setRsvpCount] = useState(event.rsvp_count || 0)

  const eventDate = new Date(event.event_date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleRsvp = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to RSVP',
        variant: 'destructive',
      })
      return
    }

    setIsRsvping(true)

    try {
      const response = await fetch(`/api/events/${event.id}/rsvp`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to RSVP')
      }

      setHasRsvp(true)
      setRsvpCount((prev) => prev + 1)

      toast({
        title: 'RSVP confirmed',
        description: 'We&apos;ll notify you about this event',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to RSVP',
        variant: 'destructive',
      })
    } finally {
      setIsRsvping(false)
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Event Image */}
      {event.image_url && (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            quality={85}
          />

          {/* Source Badge */}
          <div className="absolute left-3 top-3">
            <Badge className="bg-black/70 text-white">
              {event.source === 'bookmyshow' ? 'BookMyShow' : event.source}
            </Badge>
          </div>

          {/* Category Badge */}
          <div className="absolute right-3 top-3">
            <Badge variant="secondary" className="capitalize">
              {event.category}
            </Badge>
          </div>
        </div>
      )}

      <CardContent className="space-y-3 p-4">
        {/* Title */}
        <h3 className="font-semibold line-clamp-2">{event.title}</h3>

        {/* Date & Location */}
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {formattedDate} at {formattedTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>
              {event.venue}, {event.city}
            </span>
          </div>
        </div>

        {/* Price */}
        {event.price && <div className="font-semibold text-brand-primary">{event.price}</div>}

        {/* Actions */}
        <div className="flex gap-2">
          {event.source === 'bookmyshow' && event.ticket_url ? (
            <Button variant="default" size="sm" asChild className="flex-1">
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Book Tickets
              </a>
            </Button>
          ) : (
            <Button
              variant={hasRsvp ? 'outline' : 'default'}
              size="sm"
              onClick={handleRsvp}
              disabled={isRsvping || hasRsvp}
              className="flex-1"
            >
              {hasRsvp ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  RSVP&apos;d ({rsvpCount})
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  RSVP
                </>
              )}
            </Button>
          )}

          <Button variant="outline" size="sm" asChild>
            <Link href={`/events/${event.id}`}>Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
