/**
 * Application Constants
 * Centralized configuration values used throughout the app
 */

// ============================================
// ARTIST SERVICE CATEGORIES
// ============================================
export const ARTIST_CATEGORIES = [
  'Musician',
  'DJ',
  'Photographer',
  'Videographer',
  'Makeup Artist',
  'Dancer',
  'Comedian',
  'Chef',
  'Artist',
  'Other',
] as const

export type ArtistCategory = (typeof ARTIST_CATEGORIES)[number]

// ============================================
// POLL CATEGORIES
// ============================================
export const POLL_CATEGORIES = [
  'Infrastructure',
  'Safety',
  'Events',
  'Environment',
  'General',
] as const

export type PollCategory = (typeof POLL_CATEGORIES)[number]

// ============================================
// REPORT REASONS
// ============================================
export const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Misinformation',
  'Violence',
  'NSFW',
  'Other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

// ============================================
// BOOKING STATUSES
// ============================================
export const BOOKING_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'info_requested',
  'completed',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

// ============================================
// SUBSCRIPTION STATUSES
// ============================================
export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'expired', 'cancelled'] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

// ============================================
// MODERATION ACTIONS
// ============================================
export const MODERATION_ACTIONS = [
  'removed',
  'dismissed',
  'warned',
  'temp_banned',
  'banned',
] as const

export type ModerationAction = (typeof MODERATION_ACTIONS)[number]

// ============================================
// CONTENT LIMITS
// ============================================
export const CONTENT_LIMITS = {
  POST_TITLE_MAX: 300,
  POST_BODY_MAX: 10000,
  COMMENT_BODY_MAX: 5000,
  POLL_QUESTION_MAX: 300,
  POLL_OPTION_MAX: 100,
  POLL_OPTIONS_MIN: 2,
  POLL_OPTIONS_MAX: 10,
  ARTIST_DESCRIPTION_MAX: 500,
  ARTIST_PORTFOLIO_IMAGES_MAX: 10,
  BOOKING_MESSAGE_MAX: 500,
  MESSAGE_MAX: 5000,
  REPORT_CONTEXT_MAX: 200,
  COMMUNITY_NAME_MAX: 50,
  COMMUNITY_DESCRIPTION_MAX: 500,
  IMAGE_MAX_SIZE_MB: 5,
  IMAGE_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  VIDEO_MAX_SIZE_MB: 50,
  VIDEO_MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  POST_MEDIA_MAX: 10,
} as const

// ============================================
// RATE LIMITS
// ============================================
export const RATE_LIMITS = {
  POSTS_PER_DAY: 10,
  COMMENTS_PER_DAY: 50,
  REPORTS_PER_DAY: 20,
  MESSAGES_PER_DAY: 50,
  API_REQUESTS_PER_MINUTE: 100,
} as const

// ============================================
// TIME CONSTANTS
// ============================================
export const TIME_CONSTANTS = {
  EDIT_WINDOW_MINUTES: 10,
  MESSAGE_EDIT_WINDOW_MINUTES: 10,
  SESSION_DURATION_DAYS: 30,
  SUBSCRIPTION_GRACE_PERIOD_DAYS: 15,
  FREE_TRIAL_DAYS: 30,
  CACHE_TTL_MINUTES: 15,
  FEED_REFRESH_SECONDS: 60,
  PRESENCE_HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
} as const

// ============================================
// PAGINATION
// ============================================
export const PAGINATION = {
  POSTS_PER_PAGE: 20,
  COMMENTS_PER_PAGE: 50,
  COMMUNITIES_PER_PAGE: 24,
  ARTISTS_PER_PAGE: 20,
  EVENTS_PER_PAGE: 20,
} as const

// ============================================
// PRICING
// ============================================
export const PRICING = {
  ARTIST_SUBSCRIPTION_MONTHLY: 500, // ₹500/month
  PREMIUM_USER_MONTHLY: 99, // ₹99/month (Phase 2)
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
} as const

// ============================================
// URLS
// ============================================
export const EXTERNAL_URLS = {
  NEWS_API: 'https://newsapi.org/v2',
  REDDIT_API: 'https://www.reddit.com',
  BOOKMYSHOW_API: 'https://api.bookmyshow.com', // Placeholder
} as const

// ============================================
// APP METADATA
// ============================================
export const APP_METADATA = {
  NAME: 'Theglocal',
  TAGLINE: 'Privacy-First Local Community Platform',
  DESCRIPTION:
    'Connect with your local community anonymously. Discover events, engage in civic discussions, and support local artists.',
  VERSION: '0.1.0',
} as const
