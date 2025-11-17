/**
 * Media Types
 *
 * Type definitions for media items, variants, and uploads.
 * These types replace `any` types related to media handling.
 */

import { Database } from './database.types'

// Base media item type from database
export type MediaItem = Database['public']['Tables']['media_items']['Row']
export type MediaItemInsert = Database['public']['Tables']['media_items']['Insert']
export type MediaItemUpdate = Database['public']['Tables']['media_items']['Update']

// Media variant structure
export interface MediaVariants {
  original: string
  large?: string
  medium?: string
  thumbnail?: string
  webp?: {
    large?: string
    medium?: string
    thumbnail?: string
  }
  [key: string]: string | { [key: string]: string } | undefined
}

// Type guard for MediaVariants
export function isMediaVariants(value: unknown): value is MediaVariants {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return typeof obj.original === 'string'
}

// Media item with variants parsed
export interface MediaItemWithVariants extends Omit<MediaItem, 'variants'> {
  variants: MediaVariants | null
}

// Media type enum
export type MediaType = 'image' | 'video' | 'gif'

// Owner type enum
export type MediaOwnerType = 'post' | 'comment' | 'poll_comment'

// Media item for client-side use (may have additional properties)
export interface ClientMediaItem {
  id: string
  url: string
  mediaType: MediaType
  media_type?: MediaType // Support both naming conventions
  variants?: MediaVariants
  duration?: number
  thumbnailUrl?: string
  thumbnail_url?: string // Support both naming conventions
  fileSize?: number
  file_size?: number // Support both naming conventions
  mimeType?: string
  mime_type?: string // Support both naming conventions
  altText?: string
  alt_text?: string // Support both naming conventions
  display_order?: number
  owner_type?: MediaOwnerType
  owner_id?: string
  created_at?: string
  updated_at?: string
}

// Helper to convert database media item to client media item
export function toClientMediaItem(item: MediaItem | ClientMediaItem): ClientMediaItem {
  // If already a client media item, return as is
  if ('mediaType' in item || 'media_type' in item) {
    return item as ClientMediaItem
  }

  // Convert database item to client item
  const dbItem = item as MediaItem
  let variants: MediaVariants | undefined
  if (dbItem.variants) {
    if (typeof dbItem.variants === 'object' && dbItem.variants !== null) {
      variants = dbItem.variants as MediaVariants
    }
  }

  return {
    id: dbItem.id,
    url: dbItem.url,
    mediaType: dbItem.media_type,
    media_type: dbItem.media_type,
    variants,
    duration: dbItem.duration ?? undefined,
    thumbnailUrl: dbItem.thumbnail_url ?? undefined,
    thumbnail_url: dbItem.thumbnail_url ?? undefined,
    fileSize: dbItem.file_size ?? undefined,
    file_size: dbItem.file_size ?? undefined,
    mimeType: dbItem.mime_type ?? undefined,
    mime_type: dbItem.mime_type ?? undefined,
    altText: dbItem.alt_text ?? undefined,
    alt_text: dbItem.alt_text ?? undefined,
    display_order: dbItem.display_order,
    owner_type: dbItem.owner_type,
    owner_id: dbItem.owner_id,
    created_at: dbItem.created_at,
    updated_at: dbItem.updated_at,
  }
}

// Type guard for media item
export function isMediaItem(value: unknown): value is MediaItem | ClientMediaItem {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.url === 'string' &&
    (typeof obj.media_type === 'string' || typeof obj.mediaType === 'string')
  )
}

// Media upload result
export interface MediaUploadResult {
  id: string
  url: string
  variants: MediaVariants
  mediaType: MediaType
  duration?: number
  thumbnailUrl?: string
  fileSize: number
  mimeType: string
  altText?: string
  error?: string
  file?: File
}

// Media variant schema for Zod validation
export const mediaVariantSchema = {
  original: 'string',
  large: 'string?',
  medium: 'string?',
  thumbnail: 'string?',
  webp: {
    large: 'string?',
    medium: 'string?',
    thumbnail: 'string?',
  },
} as const
