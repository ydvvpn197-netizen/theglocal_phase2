'use client'

import { useState, useEffect, useCallback } from 'react'
import { EventCard } from './event-card'
import { EventFilters } from './event-filters'
import { Loader2 } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'

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
  price?: string
  rsvp_count?: number
  user_rsvp?: boolean
}

export function EventList() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const { userCity } = useLocation()

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (userCity) params.append('city', userCity)
      if (category !== 'all') params.append('category', category)
      if (dateFilter !== 'all') params.append('date', dateFilter)

      const response = await fetch(`/api/events?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch events')
      }

      setEvents(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }, [userCity, category, dateFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive">{error}</p>
        <button
          onClick={fetchEvents}
          className="mt-4 text-sm text-destructive underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <EventFilters
        category={category}
        dateFilter={dateFilter}
        onCategoryChange={setCategory}
        onDateFilterChange={setDateFilter}
      />

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg">No events found</p>
          <p className="mt-2 text-sm">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
