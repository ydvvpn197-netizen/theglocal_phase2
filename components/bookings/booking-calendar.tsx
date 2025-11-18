'use client'

import { useState, useMemo, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enIN } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import {
  type Booking,
  type CalendarEvent,
  bookingsToEvents,
  getEventStyle,
} from '@/lib/utils/calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-IN': enIN,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface BookingCalendarProps {
  bookings: Booking[]
  isArtist: boolean
  statusFilter?: string
}

export function BookingCalendar({
  bookings,
  isArtist,
  statusFilter = 'all',
}: BookingCalendarProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<View>('month')

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings
    return bookings.filter((booking) => booking.status === statusFilter)
  }, [bookings, statusFilter])

  // Convert bookings to calendar events
  const events = useMemo(() => {
    return bookingsToEvents(filteredBookings, isArtist)
  }, [filteredBookings, isArtist])

  // Handle event click - navigate to booking detail page
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      router.push(`/bookings/${event.resource.bookingId}`)
    },
    [router]
  )

  // Handle date navigation
  const navigate = useCallback(
    (action: 'prev' | 'next' | 'today') => {
      if (action === 'today') {
        setCurrentDate(new Date())
      } else if (action === 'prev') {
        setCurrentDate((prev) => {
          const newDate = new Date(prev)
          if (view === 'month') {
            newDate.setMonth(newDate.getMonth() - 1)
          } else if (view === 'week') {
            newDate.setDate(newDate.getDate() - 7)
          } else {
            newDate.setDate(newDate.getDate() - 1)
          }
          return newDate
        })
      } else {
        setCurrentDate((prev) => {
          const newDate = new Date(prev)
          if (view === 'month') {
            newDate.setMonth(newDate.getMonth() + 1)
          } else if (view === 'week') {
            newDate.setDate(newDate.getDate() + 7)
          } else {
            newDate.setDate(newDate.getDate() + 1)
          }
          return newDate
        })
      }
    },
    [view]
  )

  // Handle view change
  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
  }, [])

  // Handle date change
  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  // Custom event component for better mobile display
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    return (
      <div
        className="rbc-event-content"
        title={typeof event.title === 'string' ? event.title : undefined}
      >
        <div className="text-xs font-medium truncate">{event.title}</div>
        {event.resource.location && (
          <div className="text-xs opacity-90 truncate">{event.resource.location}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* View Selector */}
            <div className="flex items-center gap-2">
              <Select value={view} onValueChange={(value) => handleViewChange(value as View)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('prev')}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('today')}
                aria-label="Today"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('next')}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="h-[600px] min-h-[400px]">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookings in this view</h3>
                <p className="text-muted-foreground">
                  {statusFilter !== 'all'
                    ? 'No bookings match the selected filter for this date range.'
                    : 'No bookings scheduled for this date range.'}
                </p>
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={handleViewChange}
                date={currentDate}
                onNavigate={handleNavigate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={getEventStyle}
                components={{
                  event: EventComponent,
                }}
                popup
                showMultiDayTimes
                step={60}
                timeslots={1}
                className="rbc-calendar"
                formats={{
                  dayFormat: 'EEE, MMM d',
                  dayHeaderFormat: 'EEEE, MMMM d',
                  dayRangeHeaderFormat: ({ start, end }) =>
                    `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
                  monthHeaderFormat: 'MMMM yyyy',
                  weekdayFormat: 'EEE',
                  timeGutterFormat: 'HH:mm',
                  eventTimeRangeFormat: ({ start, end }) =>
                    `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center text-sm">
            <span className="font-medium">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500"></div>
              <span>Accepted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span>Declined</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span>Info Requested</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-500"></div>
              <span>Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
