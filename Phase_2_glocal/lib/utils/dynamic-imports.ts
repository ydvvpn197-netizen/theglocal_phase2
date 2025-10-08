/**
 * Dynamic imports for code splitting and performance optimization
 * These components are loaded on-demand to reduce initial bundle size
 */

import dynamic from 'next/dynamic'

// Heavy components that benefit from code splitting
export const DynamicBookingDialog = dynamic(
  () => import('@/components/bookings/booking-dialog').then((mod) => ({ default: mod.BookingDialog })),
  {
    loading: () => null,
    ssr: false,
  }
)

export const DynamicBookingMessages = dynamic(
  () => import('@/components/bookings/booking-messages').then((mod) => ({ default: mod.BookingMessages })),
  {
    loading: () => <div className="text-center py-4">Loading messages...</div>,
    ssr: false,
  }
)

export const DynamicReportDialog = dynamic(
  () => import('@/components/moderation/report-dialog').then((mod) => ({ default: mod.ReportDialog })),
  {
    loading: () => null,
    ssr: false,
  }
)

export const DynamicModerationLogTable = dynamic(
  () => import('@/components/moderation/moderation-log-table').then((mod) => ({ default: mod.ModerationLogTable })),
  {
    loading: () => <div className="text-center py-8">Loading moderation log...</div>,
    ssr: false,
  }
)

export const DynamicSubscriptionForm = dynamic(
  () => import('@/components/artists/subscription-form').then((mod) => ({ default: mod.SubscriptionForm })),
  {
    loading: () => <div className="text-center py-8">Loading payment form...</div>,
    ssr: false,
  }
)

export const DynamicCreateEventForm = dynamic(
  () => import('@/components/events/create-event-form').then((mod) => ({ default: mod.CreateEventForm })),
  {
    loading: () => <div className="text-center py-4">Loading form...</div>,
  }
)

export const DynamicCreatePollForm = dynamic(
  () => import('@/components/polls/create-poll-form').then((mod) => ({ default: mod.CreatePollForm })),
  {
    loading: () => <div className="text-center py-4">Loading form...</div>,
  }
)

