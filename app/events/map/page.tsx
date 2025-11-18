'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { List, Loader2, Filter, MapPin } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Dynamic import for map component (saves ~200KB from initial bundle)
const EventMap = dynamic(
  () => import('@/components/maps/event-map').then((mod) => ({ default: mod.EventMap })),
  {
    loading: () => (
      <div className="h-[600px] w-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center space-y-2">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false, // Maps require browser APIs
  }
)

interface Event {
  id: string
  title: string
  venue?: string
  city: string
  event_date: string
  category: string
  distance_km?: number
  latitude?: number
  longitude?: number
}

export default function EventsMapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userCoordinates, radius } = useLocation()

  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || 'all')

  const fetchEvents = useCallback(async () => {
    if (!userCoordinates) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        lat: userCoordinates.lat.toString(),
        lng: userCoordinates.lng.toString(),
        radius: radius.toString(),
        limit: '100',
      })

      if (category && category !== 'all') params.append('category', category)
      if (dateFilter && dateFilter !== 'all') params.append('date', dateFilter)

      const response = await fetch(`/api/v2/events?${params}`)
      const result = await response.json()

      if (response.ok) {
        // Parse coordinates
        const eventsWithCoords = (result.data || []).map((event: unknown) => {
          if (!event || typeof event !== 'object') return event
          const eventRecord = event as Record<string, unknown>
          let latitude, longitude

          // Try to parse from various possible coordinate sources
          const locationCoords = eventRecord.location_coordinates
          if (locationCoords && typeof locationCoords === 'string') {
            const match = locationCoords.match(/POINT\(([^ ]+) ([^ ]+)\)/)
            if (match && match[1] && match[2]) {
              longitude = parseFloat(match[1])
              latitude = parseFloat(match[2])
            }
          }

          return { ...eventRecord, latitude, longitude }
        })

        setEvents(eventsWithCoords)
      }
    } catch (error) {
      logger.error('Failed to fetch events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userCoordinates, radius, category, dateFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleEventClick = (event: Event) => {
    router.push(`/events/${event.id}`)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Events Map View</h1>
            <p className="mt-2 text-muted-foreground">Discover events happening near you</p>
          </div>

          <Button variant="outline" onClick={() => router.push('/events')}>
            <List className="mr-2 h-4 w-4" />
            List View
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Music">Music</SelectItem>
              <SelectItem value="Comedy">Comedy</SelectItem>
              <SelectItem value="Workshop">Workshop</SelectItem>
              <SelectItem value="Sports">Sports</SelectItem>
              <SelectItem value="Food">Food & Drink</SelectItem>
              <SelectItem value="Arts">Arts & Theater</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Map */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !userCoordinates ? (
          <div className="flex flex-col items-center justify-center h-[600px] bg-muted rounded-lg">
            <p className="text-muted-foreground mb-4">Please set your location to use map view</p>
            <Button onClick={() => router.push('/events')}>Go to List View</Button>
          </div>
        ) : (
          <EventMap events={events} onEventClick={handleEventClick} height="600px" />
        )}

        {/* Event Count */}
        {!isLoading && events.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {events.length} events within {radius} km
          </p>
        )}
      </div>
    </div>
  )
}
