'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBookingSchema } from '@/lib/utils/validation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/context/auth-context'
import { Loader2, Calendar, MapPin, DollarSign } from 'lucide-react'

type BookingFormData = Omit<z.infer<typeof createBookingSchema>, 'event_date' | 'artist_id'> & {
  event_date: string
  event_time: string
}

interface BookingFormProps {
  artistId: string
  artistName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function BookingForm({ artistId, artistName, onSuccess, onCancel }: BookingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(
      z.object({
        event_date: z.string().min(1, 'Date is required'),
        event_time: z.string().min(1, 'Time is required'),
        event_type: z.string().min(3, 'Event type is required'),
        location: z.string().min(3, 'Location is required'),
        budget_range: z.string().optional(),
        message: z.string().max(500, 'Message too long').optional(),
      })
    ),
  })

  const onSubmit = async (data: BookingFormData) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to request a booking',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // Combine date and time into ISO string
      const eventDateTime = new Date(`${data.event_date}T${data.event_time}`)

      // Validate future date
      if (eventDateTime <= new Date()) {
        toast({
          title: 'Invalid date',
          description: 'Event date must be in the future',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist_id: artistId,
          event_date: eventDateTime.toISOString(),
          event_type: data.event_type,
          location: data.location,
          budget_range: data.budget_range,
          message: data.message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking request')
      }

      toast({
        title: 'Booking request sent',
        description: `Your booking request has been sent to ${artistName}`,
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/bookings/${result.data.id}`)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send booking request',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Event Date and Time */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Event Date
          </label>
          <Input
            type="date"
            {...register('event_date')}
            min={new Date().toISOString().split('T')[0]}
          />
          {errors.event_date && (
            <p className="mt-1 text-sm text-destructive">{errors.event_date.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Event Time</label>
          <Input type="time" {...register('event_time')} />
          {errors.event_time && (
            <p className="mt-1 text-sm text-destructive">{errors.event_time.message}</p>
          )}
        </div>
      </div>

      {/* Event Type */}
      <div>
        <label className="text-sm font-medium">Event Type</label>
        <Input
          {...register('event_type')}
          placeholder="e.g., Wedding, Birthday Party, Corporate Event"
          maxLength={100}
        />
        {errors.event_type && (
          <p className="mt-1 text-sm text-destructive">{errors.event_type.message}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Event Location
        </label>
        <Input {...register('location')} placeholder="Venue name and address" maxLength={200} />
        {errors.location && (
          <p className="mt-1 text-sm text-destructive">{errors.location.message}</p>
        )}
      </div>

      {/* Budget Range */}
      <div>
        <label className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Budget Range (Optional)
        </label>
        <Input
          {...register('budget_range')}
          placeholder="e.g., ₹10,000 - ₹20,000"
          maxLength={100}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Share your budget to help the artist provide accurate pricing
        </p>
        {errors.budget_range && (
          <p className="mt-1 text-sm text-destructive">{errors.budget_range.message}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="text-sm font-medium">Additional Details (Optional)</label>
        <Textarea
          {...register('message')}
          placeholder="Tell the artist more about your event requirements..."
          rows={5}
          maxLength={500}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Include details like number of guests, event duration, special requirements, etc.
        </p>
        {errors.message && (
          <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Request...
            </>
          ) : (
            'Send Booking Request'
          )}
        </Button>

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Your booking request will be sent to <strong>{artistName}</strong>. They will respond with
        availability and pricing details.
      </p>
    </form>
  )
}
