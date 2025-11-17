export type NotificationType =
  | 'comment_on_post'
  | 'comment_reply'
  | 'post_upvote'
  | 'poll_upvote'
  | 'comment_upvote'
  | 'booking_update'
  | 'booking_request'
  | 'community_invite'
  | 'artist_response'
  | 'event_reminder'
  | 'community_role_change'
  | 'direct_message'
  | 'booking_message'
  | 'subscription_reminder'
  | 'subscription_update'
  | 'subscription_expired'
  | 'content_reported'
  | 'mention'
  | 'moderation_action'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  actor_id: string | null
  entity_id: string | null
  entity_type: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
  expires_at: string
  batch_key?: string | null
  batch_count?: number | null
  data?: Record<string, unknown> | null
}

export type EmailDigestFrequency = 'daily' | 'weekly' | 'never'

export interface NotificationPreferences {
  user_id: string
  comments_on_post: boolean
  comment_replies: boolean
  post_votes: boolean
  poll_votes: boolean
  comment_votes: boolean
  bookings: boolean
  booking_requests: boolean
  community_invites: boolean
  artist_responses: boolean
  event_reminders: boolean
  direct_messages: boolean
  booking_messages: boolean
  mentions: boolean
  moderation_actions: boolean
  email_digest_enabled: boolean
  email_digest_frequency: EmailDigestFrequency
  quiet_hours_enabled: boolean
  quiet_hours_start: string // Time format: "HH:MM:SS"
  quiet_hours_end: string // Time format: "HH:MM:SS"
  quiet_hours_timezone: string // Timezone string: "UTC", "America/New_York", etc.
  created_at: string
  updated_at: string
}

export interface NotificationWithActor extends Notification {
  actor?: {
    anonymous_handle: string
    avatar_seed: string
  }
}
