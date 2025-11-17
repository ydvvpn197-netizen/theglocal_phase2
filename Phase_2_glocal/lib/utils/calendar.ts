import { Event } from 'react-big-calendar'
import { format } from 'date-fns'
import type { BookingStatus } from '@/lib/utils/constants'

export interface Booking {
  id: string
  artist_id: string
  user_id: string
  event_date: string
  event_type: string
  location: string
  budget_range?: string
  status: BookingStatus
  created_at: string
  artists?: {
    stage_name: string
    service_category: string
  }
  users?: {
    anonymous_handle: string
  }
}

export interface CalendarEvent extends Event {
  id?: string
  resource: {
    bookingId: string
    status: BookingStatus
    eventType: string
    location: string
    artistName?: string
    clientName?: string
    budgetRange?: string
  }
}

/**
 * Map booking status to color for calendar events
 */
export function getStatusColor(status: BookingStatus): string {
  const colorMap: Record<BookingStatus, string> = {
    pending: '#f59e0b', // amber-500
    accepted: '#10b981', // emerald-500
    declined: '#ef4444', // red-500
    info_requested: '#3b82f6', // blue-500
    completed: '#6b7280', // gray-500
  }
  return colorMap[status] || '#6b7280'
}

/**
 * Format event title for calendar display
 */
export function formatEventTitle(booking: Booking, isArtist: boolean): string {
  const eventType = booking.event_type
  const name = isArtist
    ? booking.users?.anonymous_handle || 'Anonymous'
    : booking.artists?.stage_name || 'Artist'

  return `${eventType} - ${name}`
}

/**
 * Convert booking object to calendar event format
 */
export function bookingToEvent(booking: Booking, isArtist: boolean): CalendarEvent {
  const start = new Date(booking.event_date)
  // Default event duration to 2 hours if not specified
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  return {
    id: booking.id,
    title: formatEventTitle(booking, isArtist),
    start,
    end,
    resource: {
      bookingId: booking.id,
      status: booking.status,
      eventType: booking.event_type,
      location: booking.location,
      artistName: booking.artists?.stage_name,
      clientName: booking.users?.anonymous_handle,
      budgetRange: booking.budget_range,
    },
  }
}

/**
 * Convert array of bookings to calendar events
 */
export function bookingsToEvents(bookings: Booking[], isArtist: boolean): CalendarEvent[] {
  return bookings.map((booking) => bookingToEvent(booking, isArtist))
}

/**
 * Filter bookings by date range (for performance optimization)
 */
export function filterBookingsByDateRange(
  bookings: Booking[],
  startDate: Date,
  endDate: Date
): Booking[] {
  return bookings.filter((booking) => {
    const eventDate = new Date(booking.event_date)
    return eventDate >= startDate && eventDate <= endDate
  })
}

/**
 * Get event style based on status
 */
export function getEventStyle(event: CalendarEvent) {
  return {
    style: {
      backgroundColor: getStatusColor(event.resource.status),
      borderColor: getStatusColor(event.resource.status),
      color: '#ffffff',
      borderRadius: '4px',
      border: 'none',
      padding: '2px 4px',
      fontSize: '0.875rem',
    },
  }
}

/**
 * Format date for display in calendar
 */
export function formatCalendarDate(date: Date, formatStr: string = 'PP'): string {
  return format(date, formatStr)
}
