/**
 * Realtime Types
 *
 * Type definitions for Supabase realtime payloads and event handlers.
 * These types replace `any` types in realtime hooks.
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { Database } from './database.types'

// Extract table row types from database schema
type PostRow = Database['public']['Tables']['posts']['Row']
// Comments table may not be in generated types, define manually
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
type MediaItemRow = Database['public']['Tables']['media_items']['Row']
export type CommunityRow = Database['public']['Tables']['communities']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type ArtistRow = Database['public']['Tables']['artists']['Row']

// Generic realtime payload type for postgres_changes events
export interface RealtimePostgresChangePayload<T = unknown> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
  schema: string
  table: string
  commit_timestamp?: string
  errors?: string[]
}

// Specific payload types for each table
export type PostPayload = RealtimePostgresChangePayload<PostRow>
export type CommentPayload = RealtimePostgresChangePayload<CommentRow>
export type MediaItemPayload = RealtimePostgresChangePayload<MediaItemRow>
export type CommunityPayload = RealtimePostgresChangePayload<CommunityRow>
export type UserPayload = RealtimePostgresChangePayload<UserRow>
export type ArtistPayload = RealtimePostgresChangePayload<ArtistRow>

// Message and conversation types (if not in database types, define here)
export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file'
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface ConversationRow {
  id: string
  user1_id: string
  user2_id: string
  participant_1_id?: string
  participant_2_id?: string
  last_message_id: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface ConversationReadRow {
  id: string
  conversation_id: string
  user_id: string
  message_id?: string
  last_read_message_id: string | null
  last_read_at: string
  created_at: string
  updated_at: string
}

export type MessagePayload = RealtimePostgresChangePayload<MessageRow>
export type ConversationPayload = RealtimePostgresChangePayload<ConversationRow>
export type ConversationReadPayload = RealtimePostgresChangePayload<ConversationReadRow>

// Vote types
export interface VoteRow {
  id: string
  user_id: string
  content_type: 'post' | 'comment' | 'poll_comment'
  content_id: string
  vote_type: 'upvote' | 'downvote'
  created_at: string
  updated_at: string
}

export type VotePayload = RealtimePostgresChangePayload<VoteRow>

// Poll types
export interface PollRow {
  id: string
  community_id: string
  author_id: string
  question: string
  options: unknown // JSON array
  expires_at: string | null
  is_closed: boolean
  total_votes?: number
  upvotes?: number
  downvotes?: number
  comment_count?: number
  created_at: string
  updated_at: string
}

export interface PollOptionRow {
  id: string
  poll_id: string
  option_text: string
  vote_count: number
  display_order: number
  created_at: string
  updated_at: string
}

export type PollPayload = RealtimePostgresChangePayload<PollRow>
export type PollOptionPayload = RealtimePostgresChangePayload<PollOptionRow>

// Poll comment types
export interface PollCommentRow {
  id: string
  poll_id: string
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

export type PollCommentPayload = RealtimePostgresChangePayload<PollCommentRow>

// Event types
export interface EventRow {
  id: string
  community_id: string
  organizer_id: string
  title: string
  description: string | null
  event_date: string
  location_city: string
  location_coordinates: string | null
  is_cancelled: boolean
  category?: string
  venue?: string | null
  location_address?: string | null
  image_url?: string | null
  external_booking_url?: string | null
  source?: string
  source_platform?: string | null
  price?: string | null
  ticket_info?: string | null
  rsvp_count?: number
  artist_id?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
}

export type EventPayload = RealtimePostgresChangePayload<EventRow>

// Booking types
export interface BookingRow {
  id: string
  artist_id: string
  client_id: string
  event_id: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  booking_date: string
  message: string | null
  created_at: string
  updated_at: string
}

export type BookingPayload = RealtimePostgresChangePayload<BookingRow>

// Community membership types
export interface CommunityMembershipRow {
  id: string
  community_id: string
  user_id: string
  role: 'member' | 'moderator' | 'admin'
  joined_at: string
  created_at: string
  updated_at: string
}

export type CommunityMembershipPayload = RealtimePostgresChangePayload<CommunityMembershipRow>

// RealtimeChannel type helper
export type RealtimeChannelRef = RealtimeChannel | null

// Helper type for event queue items
export interface RealtimeEventQueueItem<T = unknown> {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: RealtimePostgresChangePayload<T>
  timestamp: number
}

// Type guard helpers (will be implemented in type-guards.ts)
export type RealtimePayloadType =
  | PostPayload
  | CommentPayload
  | MediaItemPayload
  | CommunityPayload
  | MessagePayload
  | ConversationPayload
  | ConversationReadPayload
  | VotePayload
  | PollPayload
  | PollOptionPayload
  | PollCommentPayload
  | EventPayload
  | BookingPayload
  | CommunityMembershipPayload
