'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, ExternalLink, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface EventItem {
  id: string
  type: 'event'
  title: string
  description?: string
  url?: string
  source?: string
  publishedAt?: string
  eventDate?: string
  location?: string
  category?: string
  imageUrl?: string
  price?: string
  venue?: string
  rsvpCount?: number
  distance_km?: number // NEW: from v2 API proximity search
}

interface EventCardProps {
  item: EventItem
}

export function EventCard({ item }: EventCardProps) {
  const router = useRouter()

  const handleEventClick = () => {
    if (item.url) {
      window.open(item.url, '_blank')
    } else {
      router.push(`/events/${item.id}`)
    }
  }

  const formatEventDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {item.imageUrl && (
        <div className="aspect-video relative">
          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2">{item.title}</h3>
          {item.category && (
            <Badge variant="secondary" className="shrink-0">
              {item.category}
            </Badge>
          )}
        </div>

        {item.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {item.eventDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDate(item.eventDate)}</span>
            </div>
          )}

          {item.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{item.location}</span>
            </div>
          )}

          {item.distance_km && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>📍 {item.distance_km.toFixed(1)} km away</span>
            </div>
          )}

          {item.price && <div className="text-sm font-medium text-green-600">{item.price}</div>}

          {item.venue && <div className="text-sm text-muted-foreground">Venue: {item.venue}</div>}

          {item.rsvpCount && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              <span>{item.rsvpCount} going</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.source && <span>via {item.source}</span>}
            {item.publishedAt && <span>• {formatDistanceToNow(new Date(item.publishedAt))}</span>}
          </div>

          <Button onClick={handleEventClick} size="sm" variant="outline" className="gap-1">
            {item.url ? (
              <>
                <ExternalLink className="h-3 w-3" />
                View Event
              </>
            ) : (
              'View Details'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
