'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEventSchema } from '@/lib/utils/validation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Calendar, MapPin, Ticket } from 'lucide-react'

// Event categories
const EVENT_CATEGORIES = [
  'Music',
  'Comedy',
  'Dance',
  'Theater',
  'Art',
  'Food',
  'Workshop',
  'Festival',
  'Other',
] as const

type EventFormData = Omit<z.infer<typeof createEventSchema>, 'event_date'> & {
  event_date: string
  event_time: string
}

interface CreateEventFormProps {
  artistId: string
  artistName: string
}

export function CreateEventForm({ artistId, artistName }: CreateEventFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>(EVENT_CATEGORIES[0])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(
      z.object({
        title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
        description: z.string().max(1000, 'Description too long').optional(),
        event_date: z.string().min(1, 'Date is required'),
        event_time: z.string().min(1, 'Time is required'),
        location_city: z.string().min(1, 'City is required'),
        location_address: z.string().optional(),
        category: z.string().min(1, 'Category is required'),
        ticket_info: z.string().optional(),
      })
    ),
    defaultValues: {
      category: EVENT_CATEGORIES[0],
    },
  })

  const onSubmit = async (data: EventFormData) => {
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

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          event_date: eventDateTime.toISOString(),
          location_city: data.location_city,
          location_address: data.location_address,
          category: data.category,
          ticket_info: data.ticket_info,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create event')
      }

      toast({
        title: 'Event created',
        description: 'Your event has been created successfully',
      })

      router.push(`/events/${result.data.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create event',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div>
        <label className="text-sm font-medium">Event Title</label>
        <Input
          {...register('title')}
          placeholder="e.g., Live Music Night at Cafe"
          maxLength={200}
        />
        {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          {...register('description')}
          placeholder="Tell people about your event..."
          rows={6}
          maxLength={1000}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Date and Time */}
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

      {/* Category */}
      <div>
        <label className="text-sm font-medium">Category</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((category) => (
            <Button
              key={category}
              type="button"
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedCategory(category)
                // Update form value
                const input = document.querySelector('input[name="category"]') as HTMLInputElement
                if (input) input.value = category
              }}
            >
              {category}
            </Button>
          ))}
        </div>
        <input type="hidden" {...register('category')} value={selectedCategory} />
        {errors.category && (
          <p className="mt-1 text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            City
          </label>
          <Input {...register('location_city')} placeholder="Mumbai, Delhi, Bangalore..." />
          {errors.location_city && (
            <p className="mt-1 text-sm text-destructive">{errors.location_city.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Venue Address (Optional)</label>
          <Input
            {...register('location_address')}
            placeholder="Venue name and address"
            maxLength={200}
          />
          {errors.location_address && (
            <p className="mt-1 text-sm text-destructive">{errors.location_address.message}</p>
          )}
        </div>
      </div>

      {/* Ticket Info */}
      <div>
        <label className="text-sm font-medium flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          Ticket Information (Optional)
        </label>
        <Textarea
          {...register('ticket_info')}
          placeholder="Entry fees, booking links, or ticketing details..."
          rows={3}
          maxLength={500}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Include ticket prices, booking links, or entry details
        </p>
        {errors.ticket_info && (
          <p className="mt-1 text-sm text-destructive">{errors.ticket_info.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Event...
            </>
          ) : (
            'Create Event'
          )}
        </Button>

        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Your event will be visible to the local community. Hosted by <strong>{artistName}</strong>
      </p>
    </form>
  )
}

