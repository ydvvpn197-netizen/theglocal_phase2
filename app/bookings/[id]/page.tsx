'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookingMessages } from '@/components/bookings/booking-messages'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, Calendar, MapPin, User, DollarSign, MessageSquare, ArrowLeft } from 'lucide-react'

interface Booking {
  id: string
  artist_id: string
  user_id: string
  event_date: string
  event_type: string
  location: string
  budget_range?: string
  message?: string
  status: string
  created_at: string
  artists?: {
    id: string
    stage_name: string
    service_category: string
    user_id: string
  }
  users?: {
    anonymous_handle: string
  }
}

interface BookingApiResponse {
  data: Booking
  meta: {
    is_artist: boolean
  }
  error?: string
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  accepted: 'default',
  declined: 'destructive',
  info_requested: 'outline',
  completed: 'default',
}

const ARTIST_ACTIONS = [
  { value: 'accepted', label: 'Accept Booking', variant: 'default' as const },
  { value: 'declined', label: 'Decline Booking', variant: 'destructive' as const },
  { value: 'info_requested', label: 'Request More Info', variant: 'outline' as const },
  { value: 'completed', label: 'Mark as Completed', variant: 'default' as const },
]

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isArtist, setIsArtist] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBooking = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/bookings/${params.id}`)
      const result = (await response.json()) as BookingApiResponse | { error: string }

      if (!response.ok) {
        const errorResult = result as { error: string }
        throw new Error(errorResult.error || 'Failed to fetch booking')
      }

      const successResult = result as BookingApiResponse
      setBooking(successResult.data)
      setIsArtist(successResult.meta.is_artist)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true)

    try {
      const response = await fetch(`/api/bookings/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update booking')
      }

      toast({
        title: 'Status updated',
        description: `Booking status changed to ${newStatus.replace('_', ' ')}`,
      })

      // Refresh booking data
      fetchBooking()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking request?')) {
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/bookings/${params.id}`, {
        method: 'DELETE',
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel booking')
      }

      toast({
        title: 'Booking cancelled',
        description: 'Your booking request has been cancelled',
      })

      router.push('/bookings')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel booking',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <p className="text-destructive">{error || 'Booking not found'}</p>
            <Button onClick={() => router.back()} variant="outline" className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const eventDate = new Date(booking.event_date)
  const isPastEvent = eventDate < new Date()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{booking.event_type}</h1>
            <p className="mt-2 text-muted-foreground">
              Booking ID: {booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[booking.status]} className="capitalize text-lg px-4 py-2">
            {booking.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Artist/User Info */}
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{isArtist ? 'Requested by' : 'Artist'}</div>
                <div className="text-sm text-muted-foreground">
                  {isArtist
                    ? booking.users?.anonymous_handle
                    : `${booking.artists?.stage_name} • ${booking.artists?.service_category?.replace('_', ' ')}`}
                </div>
              </div>
            </div>

            {/* Event Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Event Date & Time</div>
                <div className="text-sm text-muted-foreground">
                  {eventDate.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {' at '}
                  {eventDate.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isPastEvent && <span className="text-destructive"> (Past)</span>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Location</div>
                <div className="text-sm text-muted-foreground">{booking.location}</div>
              </div>
            </div>

            {/* Budget */}
            {booking.budget_range && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Budget Range</div>
                  <div className="text-sm text-muted-foreground">{booking.budget_range}</div>
                </div>
              </div>
            )}

            {/* Message */}
            {booking.message && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <div className="font-medium">Additional Details</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                    {booking.message}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Artist Actions */}
        {isArtist && booking.status !== 'completed' && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {ARTIST_ACTIONS.map((action) => {
                  // Don't show current status or irrelevant actions
                  if (action.value === booking.status) return null
                  if (action.value === 'completed' && booking.status !== 'accepted') return null

                  return (
                    <Button
                      key={action.value}
                      variant={action.variant}
                      onClick={() => handleStatusUpdate(action.value)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Actions */}
        {!isArtist && ['pending', 'info_requested'].includes(booking.status) && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleCancelBooking} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cancel Booking Request
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Message Thread */}
        <BookingMessages bookingId={booking.id} isArtist={isArtist} />
      </div>
    </div>
  )
}
