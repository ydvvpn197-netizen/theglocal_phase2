/**
 * Validation Schemas using Zod
 * Centralized validation for forms and API inputs
 */

import { z } from 'zod'
import { CONTENT_LIMITS, ARTIST_CATEGORIES, POLL_CATEGORIES, REPORT_REASONS } from './constants'

// Re-export safeArrayAccess from validation/common
export { safeArrayAccess } from '@/lib/validation/common'

// ============================================
// USER VALIDATION
// ============================================

export const signupSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
})

/**
 * Validate contact (email or phone) and return normalized format
 */
export function validateContact(contact: string): {
  valid: boolean
  error?: string
  normalized?: string
  type?: 'email' | 'phone'
} {
  if (!contact || typeof contact !== 'string') {
    return { valid: false, error: 'Contact is required' }
  }

  const trimmed = contact.trim().toLowerCase()

  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (emailRegex.test(trimmed)) {
    return {
      valid: true,
      normalized: trimmed,
      type: 'email',
    }
  }

  // Check if it's a phone number (with or without +)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  const digitsOnly = trimmed.replace(/\D/g, '')
  if (phoneRegex.test(digitsOnly)) {
    return {
      valid: true,
      normalized: digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`,
      type: 'phone',
    }
  }

  return {
    valid: false,
    error: 'Invalid email or phone number format',
  }
}

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
})

// ============================================
// COMMUNITY VALIDATION
// ============================================

export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(CONTENT_LIMITS.COMMUNITY_NAME_MAX, `Name too long`),
  description: z
    .string()
    .max(CONTENT_LIMITS.COMMUNITY_DESCRIPTION_MAX, 'Description too long')
    .optional(),
  rules: z.string().optional(),
  location_city: z.string().min(1, 'City is required'),
  is_private: z.boolean().default(false),
})

// ============================================
// POST VALIDATION
// ============================================

// Media item schema for validation
const mediaItemSchema = z.object({
  id: z.string().uuid().optional(),
  owner_type: z.enum(['post', 'comment', 'poll_comment']).optional(),
  owner_id: z.string().uuid().optional(),
  media_type: z.enum(['image', 'video', 'gif']),
  url: z.string().url(),
  variants: z.record(z.string(), z.unknown()).nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  duration: z.number().int().positive().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  file_size: z.number().int().positive().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  alt_text: z.string().nullable().optional(),
})

export const createPostSchema = z.object({
  community_id: z.string().uuid('Invalid community ID'),
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(CONTENT_LIMITS.POST_TITLE_MAX, 'Title too long'),
  body: z.string().max(CONTENT_LIMITS.POST_BODY_MAX, 'Post body too long').optional(),
  image_url: z.string().url('Invalid image URL').optional(),
  external_url: z.string().url('Invalid external URL').optional(),
  media_items: z.array(mediaItemSchema).optional(),
})

export const updatePostSchema = createPostSchema.partial().omit({ community_id: true })

// ============================================
// COMMENT VALIDATION
// ============================================

export const createCommentSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
  parent_comment_id: z.string().uuid('Invalid parent comment ID').optional(),
  body: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(CONTENT_LIMITS.COMMENT_BODY_MAX, 'Comment too long'),
})

// ============================================
// POLL VALIDATION
// ============================================

export const createPollSchema = z.object({
  community_id: z.string().uuid('Invalid community ID'),
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters')
    .max(CONTENT_LIMITS.POLL_QUESTION_MAX, 'Question too long'),
  category: z.enum(POLL_CATEGORIES),
  options: z
    .array(
      z
        .string()
        .min(1, 'Option cannot be empty')
        .max(CONTENT_LIMITS.POLL_OPTION_MAX, 'Option too long')
    )
    .min(CONTENT_LIMITS.POLL_OPTIONS_MIN, `Poll must have at least 2 options`)
    .max(CONTENT_LIMITS.POLL_OPTIONS_MAX, `Poll cannot have more than 10 options`),
  expires_at: z.date().min(new Date(), 'Expiry date must be in the future'),
  tagged_authority: z.string().optional(),
  is_multiple_choice: z.boolean().default(false),
})

// ============================================
// ARTIST VALIDATION
// ============================================

export const createArtistSchema = z.object({
  stage_name: z
    .string()
    .min(2, 'Stage name must be at least 2 characters')
    .max(100, 'Name too long'),
  service_category: z.enum(ARTIST_CATEGORIES),
  description: z
    .string()
    .max(CONTENT_LIMITS.ARTIST_DESCRIPTION_MAX, 'Description too long')
    .optional(),
  location_city: z.string().min(1, 'City is required'),
  rate_min: z.number().min(0, 'Rate must be positive').optional(),
  rate_max: z.number().min(0, 'Rate must be positive').optional(),
})

// ============================================
// EVENT VALIDATION
// ============================================

export const createEventSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  event_date: z.date().min(new Date(), 'Event date must be in the future'),
  location_city: z.string().min(1, 'City is required'),
  location_address: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  ticket_info: z.string().optional(),
})

// ============================================
// BOOKING VALIDATION
// ============================================

export const createBookingSchema = z.object({
  artist_id: z.string().uuid('Invalid artist ID'),
  event_date: z.date().min(new Date(), 'Event date must be in the future'),
  event_type: z.string().min(3, 'Event type is required'),
  location: z.string().min(3, 'Location is required'),
  budget_range: z.string().optional(),
  message: z.string().max(CONTENT_LIMITS.BOOKING_MESSAGE_MAX, 'Message too long').optional(),
})

// ============================================
// REPORT VALIDATION
// ============================================

export const createReportSchema = z.object({
  content_type: z.enum(['post', 'comment', 'poll', 'message', 'user']),
  content_id: z.string().uuid('Invalid content ID'),
  reason: z.enum(REPORT_REASONS),
  additional_context: z
    .string()
    .max(CONTENT_LIMITS.REPORT_CONTEXT_MAX, 'Context too long')
    .optional(),
})

// ============================================
// IMAGE VALIDATION
// ============================================

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = CONTENT_LIMITS.IMAGE_MAX_SIZE_MB * 1024 * 1024 // Convert to bytes
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload an image.' }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Image size exceeds maximum allowed size of ${CONTENT_LIMITS.IMAGE_MAX_SIZE_MB}MB`,
    }
  }

  return { valid: true }
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const maxSize = CONTENT_LIMITS.VIDEO_MAX_SIZE_MB * 1024 * 1024 // Convert to bytes
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload a video.' }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Video size exceeds maximum allowed size of ${CONTENT_LIMITS.VIDEO_MAX_SIZE_MB}MB`,
    }
  }

  return { valid: true }
}
