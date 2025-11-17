/**
 * Dynamic imports for code splitting and performance optimization
 * These components are loaded on-demand to reduce initial bundle size
 * Enhanced with null safety and error handling to prevent TypeError crashes
 */

import React from 'react'
import { logger } from '@/lib/utils/logger'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Loading skeleton components
const LoadingSkeleton = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center py-4">
    <Loader2 className="h-4 w-4 animate-spin mr-2" />
    <span className="text-sm text-muted-foreground">{message}</span>
  </div>
)

// Fallback components that match the original component interfaces
const BookingDialogFallback = ({
  children,
}: {
  _artistId: string
  _artistName: string
  children: React.ReactNode
}) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Booking dialog unavailable</p>
    {children}
  </div>
)

const BookingMessagesFallback = ({}: {
  _bookingId: string
  _isArtist: boolean
  _artistId?: string
  _artistName?: string
}) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Messages unavailable</p>
  </div>
)

const ReportDialogFallback = ({
  children,
}: {
  _contentType: 'post' | 'comment' | 'poll' | 'message' | 'user'
  _contentId: string
  _open: boolean
  _onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Report dialog unavailable</p>
    {children}
  </div>
)

const ModerationLogTableFallback = ({}: { _communityId?: string }) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Moderation log unavailable</p>
  </div>
)

const SubscriptionFormFallback = ({}: { _artistId: string; _onSuccess?: () => void }) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Payment form unavailable</p>
  </div>
)

const CreateEventFormFallback = ({}: { _communityId?: string; _onSuccess?: () => void }) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Event form unavailable</p>
  </div>
)

const CreatePollFormFallback = ({}: { _communityId?: string; _onSuccess?: () => void }) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Poll form unavailable</p>
  </div>
)

const CreatePostFormFallback = ({}: {
  _communityId?: string
  _onSuccess?: (postId?: string) => void
}) => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Post form unavailable</p>
  </div>
)

const ArtistFormFallback = ({
  _artistId,
  _onSuccess,
}: {
  _artistId?: string
  _onSuccess?: () => void
}) => {
  void _artistId
  void _onSuccess
  return (
    <div className="text-center py-4 text-destructive">
      <p className="text-sm">Artist form unavailable</p>
    </div>
  )
}

const SubscriptionListFallback = () => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Subscription list unavailable</p>
  </div>
)

const SubscriptionStatsFallback = () => (
  <div className="text-center py-4 text-destructive">
    <p className="text-sm">Subscription stats unavailable</p>
  </div>
)

// Safe dynamic import wrapper with null safety and enhanced error handling
const createSafeDynamicImport = <P = unknown,>(
  importPath: string,
  fallbackComponent: React.ComponentType<P>
): React.ComponentType<P> => {
  return dynamic(
    () => {
      // Wrap the entire import process in a try-catch to handle all types of errors
      return import(importPath)
        .then((mod) => {
          // Handle different types of module loading failures
          if (!mod) {
            logger.warn(`Dynamic import failed for ${importPath}: module is null`)
            return { default: fallbackComponent }
          }

          if (!mod.default) {
            logger.warn(`Dynamic import failed for ${importPath}: missing default export`)
            return { default: fallbackComponent }
          }

          // Check if default export is a valid component
          if (typeof mod.default !== 'function' && typeof mod.default !== 'object') {
            logger.warn(`Dynamic import failed for ${importPath}: invalid default export type`)
            return { default: fallbackComponent }
          }

          return mod
        })
        .catch((error) => {
          // Enhanced error logging to help debug different failure modes
          logger.error(`Dynamic import error for ${importPath}:`, {
            error: error.message,
            stack: error.stack,
            type: error.name,
          })

          // Return fallback component for any error (module not found, syntax error, etc.)
          return { default: fallbackComponent }
        })
    },
    {
      loading: () => <LoadingSkeleton />,
      ssr: false,
    }
  ) as React.ComponentType<P>
}

// Heavy components that benefit from code splitting
export const DynamicBookingDialog = createSafeDynamicImport(
  '@/components/bookings/booking-dialog',
  BookingDialogFallback
)

export const DynamicBookingMessages = createSafeDynamicImport(
  '@/components/bookings/booking-messages',
  BookingMessagesFallback
)

export const DynamicReportDialog = createSafeDynamicImport(
  '@/components/moderation/report-dialog',
  ReportDialogFallback
)

export const DynamicModerationLogTable = createSafeDynamicImport(
  '@/components/moderation/moderation-log-table',
  ModerationLogTableFallback
)

export const DynamicSubscriptionForm = createSafeDynamicImport(
  '@/components/artists/subscription-form',
  SubscriptionFormFallback
)

export const DynamicCreateEventForm = createSafeDynamicImport(
  '@/components/events/create-event-form',
  CreateEventFormFallback
)

export const DynamicCreatePollForm = createSafeDynamicImport(
  '@/components/polls/create-poll-form',
  CreatePollFormFallback
)

// Form Components - Heavy due to form libraries and validation
export const DynamicCreatePostForm = createSafeDynamicImport(
  '@/components/posts/create-post-form',
  CreatePostFormFallback
)

export const DynamicArtistForm = createSafeDynamicImport(
  '@/components/artists/artist-form',
  ArtistFormFallback
)

// Admin Components - Heavy due to data tables and analytics
export const DynamicSubscriptionList = createSafeDynamicImport(
  '@/components/admin/subscription-list',
  SubscriptionListFallback
)

export const DynamicSubscriptionStats = createSafeDynamicImport(
  '@/components/admin/subscription-stats',
  SubscriptionStatsFallback
)

// Map Components - Heavy due to Google Maps API
const MapFallback = () => (
  <div className="h-96 w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading map...</p>
    </div>
  </div>
)

export const DynamicEventMap = dynamic(
  () =>
    import('@/components/maps/event-map').then((mod) => {
      const Component = ('default' in mod && mod.default) || mod.EventMap || MapFallback
      return { default: Component as React.ComponentType<Record<string, never>> }
    }),
  {
    loading: MapFallback,
    ssr: false, // Maps require browser APIs
  }
)

export const DynamicCommunityMap = dynamic(
  () =>
    import('@/components/maps/community-map').then((mod) => {
      const Component = ('default' in mod && mod.default) || mod.CommunityMap || MapFallback
      return { default: Component as React.ComponentType<Record<string, never>> }
    }),
  {
    loading: MapFallback,
    ssr: false,
  }
)

export const DynamicArtistMap = dynamic(
  () =>
    import('@/components/maps/artist-map').then((mod) => {
      const Component = ('default' in mod && mod.default) || mod.ArtistMap || MapFallback
      return { default: Component as React.ComponentType<Record<string, never>> }
    }),
  {
    loading: MapFallback,
    ssr: false,
  }
)

// Video Components - Heavy due to video processing libraries
const VideoFallback = () => (
  <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
    <Loader2 className="h-16 w-16 text-white animate-spin" />
  </div>
)

export const DynamicVideoPlayer = dynamic(
  () =>
    import('@/components/ui/video-player').then((mod) => {
      const Component = ('default' in mod && mod.default) || mod.VideoPlayer || VideoFallback
      return { default: Component as React.ComponentType<Record<string, never>> }
    }),
  {
    loading: VideoFallback,
    ssr: false,
  }
)

export const DynamicVideoUpload = dynamic(() => import('@/components/ui/video-upload'), {
  loading: () => <LoadingSkeleton message="Loading upload..." />,
  ssr: false,
})
