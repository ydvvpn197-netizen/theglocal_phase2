'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Booking {
  id: string
  artist_id: string
  user_id: string
  event_date: string
  event_type: string
  location: string
  budget_range?: string
  status: string
  created_at: string
  artists?: {
    stage_name: string
    service_category: string
  }
  users?: {
    anonymous_handle: string
  }
}

interface BookingCardProps {
  booking: Booking
  isArtist?: boolean
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  accepted: 'default',
  declined: 'destructive',
  info_requested: 'outline',
  completed: 'default',
}

export function BookingCard({ booking, isArtist = false }: BookingCardProps) {
  const eventDate = new Date(booking.event_date)
  const isPastEvent = eventDate < new Date()

  return (
    <Link href={`/bookings/${booking.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Header */}
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{booking.event_type}</h3>
                <Badge variant={STATUS_VARIANTS[booking.status]} className="capitalize">
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Artist/User Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {isArtist ? (
                  <span>Requested by {booking.users?.anonymous_handle || 'Anonymous'}</span>
                ) : (
                  <span>
                    {booking.artists?.stage_name || 'Artist'} •{' '}
                    <span className="capitalize">
                      {booking.artists?.service_category?.replace('_', ' ') || ''}
                    </span>
                  </span>
                )}
              </div>

              {/* Event Date */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={isPastEvent ? 'text-muted-foreground' : ''}>
                  {eventDate.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {' at '}
                  {eventDate.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{booking.location}</span>
              </div>

              {/* Budget */}
              {booking.budget_range && (
                <div className="text-sm text-muted-foreground">Budget: {booking.budget_range}</div>
              )}
            </div>

            {/* Created date */}
            <div className="text-right text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
