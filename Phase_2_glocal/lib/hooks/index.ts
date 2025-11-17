/**
 * Custom Hooks Index
 *
 * Centralized exports for all custom hooks.
 */

// Optimistic update hooks
export { useOptimisticVote } from './use-optimistic-vote'
export { useOptimisticLike } from './use-optimistic-like'
export { useOptimisticComment } from './use-optimistic-comment'
export { useOptimisticFollow } from './use-optimistic-follow'

// Realtime hooks
export { useRealtimeSubscription } from './use-realtime-subscription'
export { useConversationsRealtime } from './use-conversations-realtime'
export { useMessagesRealtime } from './use-messages-realtime'
export { useUserPresence } from './use-user-presence'
export { useBookingRealtime } from './use-booking-realtime'
export { useBookingsRealtime } from './use-bookings-realtime'
export { useCommentsRealtime } from './use-comments-realtime'
export { useCommunityListRealtime } from './use-community-list-realtime'
export { useEventsRealtime } from './use-events-realtime'
export { useFeedRealtime } from './use-feed-realtime'
export { usePollCommentsRealtime } from './use-poll-comments-realtime'
export { usePollFeedRealtime } from './use-poll-feed-realtime'
export { usePollRealtime } from './use-poll-realtime'
export { usePostRealtime } from './use-post-realtime'
export { useVotesRealtime } from './use-votes-realtime'

// Form hooks
export { useEventForm } from './use-event-form'
export { useCommunityForm } from './use-community-form'

// Utility hooks
export { useToast, toast } from './use-toast'
export { useNonce } from './use-nonce'
export { useNotificationFeed } from './use-notification-feed'
export { useViewTracker } from './use-view-tracker'
export { useVideoUpload } from './useVideoUpload'
export { useUserCommunities } from './use-user-communities'
export { useSmartLocation } from './use-smart-location'
export { useIntersectionObserver } from './use-intersection-observer'
export {
  usePrefetchOnHover,
  usePrefetchOnFocus,
  usePrefetchOnVisible,
  usePrefetchUser,
  usePrefetchPost,
  usePrefetchCommunity,
  usePrefetchEvent,
  usePrefetchArtist,
  usePrefetchNextPage,
  usePrefetchRoute,
} from './use-prefetch'
export { useTypingIndicator } from './use-typing-indicator'
