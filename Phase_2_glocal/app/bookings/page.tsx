'use client'

import { useEffect, useState, useCallback } from 'react'
import { BookingCard } from '@/components/bookings/booking-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Inbox } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useRouter } from 'next/navigation'

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

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
  { label: 'Info Requested', value: 'info_requested' },
  { label: 'Completed', value: 'completed' },
]

export default function BookingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isArtist, setIsArtist] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchBookings = useCallback(async () => {
    if (!user) {
      router.push('/auth/signup')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/bookings?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch bookings')
      }

      setBookings(result.data || [])
      setIsArtist(result.meta.is_artist)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setIsLoading(false)
    }
  }, [user, router, statusFilter])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">
            {isArtist ? 'Booking Requests' : 'My Bookings'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isArtist
              ? 'Manage booking requests from clients'
              : 'View and manage your booking requests with artists'}
          </p>
        </div>

        {/* Status Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-8 text-center">
              <p className="text-destructive">{error}</p>
              <Button onClick={fetchBookings} variant="outline" className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && bookings.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
              <p className="text-muted-foreground mb-4">
                {isArtist
                  ? "You haven't received any booking requests yet."
                  : statusFilter !== 'all'
                    ? 'No bookings match the selected filter.'
                    : "You haven't made any booking requests yet."}
              </p>
              {!isArtist && statusFilter === 'all' && (
                <Button asChild>
                  <a href="/artists">Browse Artists</a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bookings List */}
        {!isLoading && !error && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} isArtist={isArtist} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

