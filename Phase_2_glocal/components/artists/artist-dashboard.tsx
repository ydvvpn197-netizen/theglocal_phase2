'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, MessageSquare, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Artist {
  id: string
  stage_name: string
  service_category: string
  location_city: string
  subscription_status: string
}

interface Event {
  id: string
  title: string
  event_date: string
  rsvp_count: number
}

interface Booking {
  id: string
  status: string
  created_at: string
}

interface ArtistDashboardProps {
  artist: Artist
  events: Event[]
  bookings: Booking[]
}

export function ArtistDashboard({ artist, events, bookings }: ArtistDashboardProps) {
  const recentBookings = bookings.slice(0, 5)
  const upcomingEvents = events.slice(0, 3)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          ) : (
            upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(event.event_date).toLocaleDateString()} • {event.rsvp_count} RSVPs
                  </div>
                </div>
              </Link>
            ))
          )}
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/events/create">Create New Event</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Bookings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet</p>
          ) : (
            recentBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Booking #{booking.id.slice(0, 8)}</span>
                    <Badge
                      variant={
                        booking.status === 'pending'
                          ? 'secondary'
                          : booking.status === 'accepted'
                            ? 'default'
                            : 'destructive'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                  </div>
                </div>
              </Link>
            ))
          )}
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/bookings">View All Bookings</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/events/create">Create Event</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href={`/artists/${artist.id}/edit`}>Edit Profile</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/bookings">Manage Bookings</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            <Badge className="capitalize">{artist.service_category.replace('_', ' ')}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{artist.location_city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {artist.subscription_status === 'active' ? 'Active subscription' : 'Trial period'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
