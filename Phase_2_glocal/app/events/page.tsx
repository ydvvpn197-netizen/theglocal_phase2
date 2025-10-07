import { Suspense } from 'react'
import { EventList } from '@/components/events/event-list'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Ticket } from 'lucide-react'

export default function EventsPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="mt-2 text-muted-foreground">
            Discover movies, concerts, plays, and events happening in your city
          </p>
        </div>

        {/* Event Sources Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Ticket className="h-8 w-8 text-brand-primary" />
              <div>
                <div className="font-semibold">BookMyShow</div>
                <div className="text-sm text-muted-foreground">Movies, plays, concerts</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Calendar className="h-8 w-8 text-brand-secondary" />
              <div>
                <div className="font-semibold">Artist Events</div>
                <div className="text-sm text-muted-foreground">Local artist performances</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <MapPin className="h-8 w-8 text-brand-accent" />
              <div>
                <div className="font-semibold">Community Events</div>
                <div className="text-sm text-muted-foreground">Meetups and gatherings</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event List */}
        <Suspense fallback={<EventListSkeleton />}>
          <EventList />
        </Suspense>
      </div>
    </div>
  )
}

function EventListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="aspect-video bg-muted" />
          <CardContent className="space-y-3 pt-4">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export const metadata = {
  title: 'Events - Theglocal',
  description: 'Discover events, movies, concerts, and shows happening in your city',
}
