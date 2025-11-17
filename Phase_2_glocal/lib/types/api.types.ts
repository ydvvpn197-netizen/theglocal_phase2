import { Database } from './database.types'

export type MediaItem = Database['public']['Tables']['media_items']['Row']
export type MediaItemInsert = Database['public']['Tables']['media_items']['Insert']
export type MediaItemUpdate = Database['public']['Tables']['media_items']['Update']

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
}

export interface MediaUploadResult {
  id: string
  url: string
  variants: MediaVariants
  mediaType: 'image' | 'video' | 'gif'
  duration?: number
  thumbnailUrl?: string
  fileSize: number
  mimeType: string
  altText?: string
  error?: string
  file?: File // For client-side file handling
}

export interface CreatePostWithMedia {
  title: string
  body?: string
  community_id: string
  location_city?: string
  location_coordinates?: { lat: number; lng: number }
  media_items?: MediaItemInsert[]
}

export interface CreateCommentWithMedia {
  text: string
  parent_id?: string
  media_items?: MediaItemInsert[]
}

export interface PostWithMedia {
  id: string
  title: string
  content: string
  author_id: string
  community_id: string
  media_type?: string | null
  media_url?: string | null
  media_variants?: MediaVariants | null
  gif_url?: string | null
  media_count: number
  upvotes: number
  downvotes: number
  comments_count: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  media_items?: MediaItem[]
  author: {
    anonymous_handle: string
    avatar_seed: string
  }
  community: {
    name: string
    slug: string
  }
}

export interface CommentWithMedia {
  id: string
  post_id: string
  author_id: string
  body: string
  parent_comment_id?: string | null
  media_count: number
  upvotes: number
  downvotes: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  media_items?: MediaItem[]
  author: {
    anonymous_handle: string
    avatar_seed: string
  }
  replies?: CommentWithMedia[]
}

export interface PollCommentWithMedia {
  id: string
  poll_id: string
  author_id: string
  body: string
  parent_comment_id?: string | null
  media_count: number
  upvotes: number
  downvotes: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  media_items?: MediaItem[]
  author: {
    anonymous_handle: string
    avatar_seed: string
  }
  replies?: PollCommentWithMedia[]
}

export interface MediaGalleryProps {
  mediaItems: MediaItem[]
  className?: string
  showLightbox?: boolean
  maxItems?: number
  compact?: boolean
}

export interface MediaUploadGalleryProps {
  onMediaRemove: (mediaId: string) => void
  currentMedia: MediaUploadResult[]
  className?: string
  uploadProgress?: unknown[]
}

export interface VideoPlayerProps {
  src: string
  thumbnailUrl?: string
  duration?: number
  className?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
}

export interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface MediaUploadState {
  files: File[]
  uploadResults: MediaUploadResult[]
  uploadProgress: UploadProgress[]
  isUploading: boolean
  error?: string
}

// Admin API Response Types
export interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

export interface AdminArtist {
  id: string
  user_id: string
  stage_name: string
  service_category: string
  location_city: string
  subscription_status: string
  subscription_start_date?: string
  subscription_end_date?: string
  subscription_cancelled_at?: string
  pricing_starting_from?: number
  created_at: string
}

export interface AdminCommunity {
  id: string
  name: string
  slug: string
  description: string
  location_city: string
  member_count: number
  is_featured: boolean
  created_at: string
}

export interface AdminUser {
  id: string
  email?: string
  anonymous_handle: string
  location_city?: string
  created_at: string
  is_banned: boolean
}

export interface AdminStats {
  total_users: number
  total_communities: number
  total_posts: number
  total_artists: number
}

export interface AdminHealth {
  database: boolean
  storage: boolean
  cache: boolean
}
