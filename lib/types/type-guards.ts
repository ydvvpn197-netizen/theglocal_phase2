/**
 * Type Guards
 *
 * Type guard functions for runtime type checking.
 * These replace `any` type assertions with proper type guards.
 */

import {
  PostPayload,
  CommentPayload,
  MediaItemPayload,
  CommunityPayload,
  MessagePayload,
  ConversationPayload,
  ConversationReadPayload,
  VotePayload,
  PollPayload,
  PollOptionPayload,
  PollCommentPayload,
  EventPayload,
  BookingPayload,
  RealtimePostgresChangePayload,
  MessageRow,
  ConversationRow,
  ConversationReadRow,
  VoteRow,
  PollRow,
  PollOptionRow,
  PollCommentRow,
  EventRow,
  BookingRow,
} from './realtime.types'
import { MediaItem, ClientMediaItem, isMediaItem } from './media.types'
import { Database } from './database.types'

type PostRow = Database['public']['Tables']['posts']['Row']
type CommentRow = {
  id: string
  post_id: string
  parent_comment_id: string | null
  author_id: string
  body: string
  upvotes: number
  downvotes: number
  is_deleted: boolean
  is_edited: boolean
  created_at: string
  updated_at: string
}
type CommunityRow = Database['public']['Tables']['communities']['Row']

// Generic payload type guard
export function isRealtimePayload<T>(
  payload: unknown,
  tableName: string
): payload is RealtimePostgresChangePayload<T> {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return (
    typeof p.table === 'string' &&
    p.table === tableName &&
    (p.new === null || typeof p.new === 'object') &&
    (p.old === null || typeof p.old === 'object')
  )
}

// Post payload type guard
export function isPostPayload(payload: unknown): payload is PostPayload {
  if (!isRealtimePayload<PostRow>(payload, 'posts')) return false
  const p = payload as RealtimePostgresChangePayload<PostRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.community_id === 'string' &&
      typeof row.author_id === 'string' &&
      typeof row.title === 'string'
    )
  }
  return true
}

// Comment payload type guard
export function isCommentPayload(payload: unknown): payload is CommentPayload {
  if (!isRealtimePayload<CommentRow>(payload, 'comments')) return false
  const p = payload as RealtimePostgresChangePayload<CommentRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.post_id === 'string' &&
      typeof row.author_id === 'string' &&
      typeof row.body === 'string'
    )
  }
  return true
}

// Media item payload type guard
export function isMediaItemPayload(payload: unknown): payload is MediaItemPayload {
  if (!isRealtimePayload<MediaItem>(payload, 'media_items')) return false
  const p = payload as RealtimePostgresChangePayload<MediaItem>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.owner_id === 'string' &&
      typeof row.url === 'string' &&
      typeof row.media_type === 'string'
    )
  }
  return true
}

// Community payload type guard
export function isCommunityPayload(payload: unknown): payload is CommunityPayload {
  if (!isRealtimePayload<CommunityRow>(payload, 'communities')) return false
  const p = payload as RealtimePostgresChangePayload<CommunityRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.name === 'string' &&
      typeof row.slug === 'string' &&
      typeof row.location_city === 'string'
    )
  }
  return true
}

// Message payload type guard
export function isMessagePayload(payload: unknown): payload is MessagePayload {
  if (!isRealtimePayload<MessageRow>(payload, 'messages')) return false
  const p = payload as RealtimePostgresChangePayload<MessageRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.conversation_id === 'string' &&
      typeof row.sender_id === 'string' &&
      typeof row.content === 'string'
    )
  }
  return true
}

// Conversation payload type guard
export function isConversationPayload(payload: unknown): payload is ConversationPayload {
  if (!isRealtimePayload<ConversationRow>(payload, 'conversations')) return false
  const p = payload as RealtimePostgresChangePayload<ConversationRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.user1_id === 'string' &&
      typeof row.user2_id === 'string'
    )
  }
  return true
}

// Conversation read payload type guard
export function isConversationReadPayload(payload: unknown): payload is ConversationReadPayload {
  if (!isRealtimePayload<ConversationReadRow>(payload, 'conversation_reads')) return false
  const p = payload as RealtimePostgresChangePayload<ConversationReadRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.conversation_id === 'string' &&
      typeof row.user_id === 'string'
    )
  }
  return true
}

// Vote payload type guard
export function isVotePayload(payload: unknown): payload is VotePayload {
  if (!isRealtimePayload<VoteRow>(payload, 'votes')) return false
  const p = payload as RealtimePostgresChangePayload<VoteRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.user_id === 'string' &&
      typeof row.content_id === 'string' &&
      typeof row.vote_type === 'string'
    )
  }
  return true
}

// Poll payload type guard
export function isPollPayload(payload: unknown): payload is PollPayload {
  if (!isRealtimePayload<PollRow>(payload, 'polls')) return false
  const p = payload as RealtimePostgresChangePayload<PollRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.community_id === 'string' &&
      typeof row.author_id === 'string' &&
      typeof row.question === 'string'
    )
  }
  return true
}

// Poll option payload type guard
export function isPollOptionPayload(payload: unknown): payload is PollOptionPayload {
  if (!isRealtimePayload<PollOptionRow>(payload, 'poll_options')) return false
  const p = payload as RealtimePostgresChangePayload<PollOptionRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.poll_id === 'string' &&
      typeof row.option_text === 'string'
    )
  }
  return true
}

// Poll comment payload type guard
export function isPollCommentPayload(payload: unknown): payload is PollCommentPayload {
  if (!isRealtimePayload<PollCommentRow>(payload, 'poll_comments')) return false
  const p = payload as RealtimePostgresChangePayload<PollCommentRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.poll_id === 'string' &&
      typeof row.author_id === 'string' &&
      typeof row.body === 'string'
    )
  }
  return true
}

// Event payload type guard
export function isEventPayload(payload: unknown): payload is EventPayload {
  if (!isRealtimePayload<EventRow>(payload, 'events')) return false
  const p = payload as RealtimePostgresChangePayload<EventRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.community_id === 'string' &&
      typeof row.organizer_id === 'string' &&
      typeof row.title === 'string'
    )
  }
  return true
}

// Booking payload type guard
export function isBookingPayload(payload: unknown): payload is BookingPayload {
  if (!isRealtimePayload<BookingRow>(payload, 'bookings')) return false
  const p = payload as RealtimePostgresChangePayload<BookingRow>
  if (p.new && typeof p.new === 'object') {
    const row = p.new as unknown as Record<string, unknown>
    return (
      typeof row.id === 'string' &&
      typeof row.artist_id === 'string' &&
      typeof row.client_id === 'string' &&
      typeof row.status === 'string'
    )
  }
  return true
}

// Error type guard
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

// Error with message type guard
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

// Get error message helper
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }
  if (isErrorWithMessage(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

// Re-export media item type guard
export { isMediaItem }

// Type guard for array of media items
export function isMediaItemArray(value: unknown): value is (MediaItem | ClientMediaItem)[] {
  return Array.isArray(value) && value.every((item) => isMediaItem(item))
}

// Type guard for record/object
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Type guard for string array
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

// Type guard for number
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

// Type guard for non-empty string
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
