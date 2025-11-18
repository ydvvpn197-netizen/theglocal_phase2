import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import { createPostSchema } from '@/lib/utils/validation'
import { isSuperAdmin } from '@/lib/utils/permissions'
import { cleanupOrphanedMedia } from './cleanup-orphaned-media'
import { PostServiceError } from './errors'

export type CreatePostInput = z.infer<typeof createPostSchema>

interface CreatePostOptions {
  supabase: SupabaseClient
  userId: string
  payload: CreatePostInput
}

interface CreatePostResult {
  message: string
  data: Record<string, unknown>
}

export async function createPost({
  supabase,
  userId,
  payload,
}: CreatePostOptions): Promise<CreatePostResult> {
  const isSuperUser = await isSuperAdmin(userId)

  if (!isSuperUser) {
    const { data: membership, error: membershipError } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', payload.community_id)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      throw new PostServiceError('You must be a member of this community to post', 403)
    }
  }

  if (payload.external_url) {
    validateExternalUrl(payload.external_url)
  }

  const mediaItems = Array.isArray(payload.media_items) ? payload.media_items : []

  if (mediaItems.length > 0) {
    await validateMediaItems(mediaItems, supabase)
  }

  const { data: result, error: createError } = await supabase.rpc('create_post_with_media', {
    p_community_id: payload.community_id,
    p_title: payload.title,
    p_body: payload.body || null,
    p_external_url: payload.external_url || null,
    p_location_city: null,
    p_media_items: mediaItems,
  })

  if (createError) {
    await cleanupOrphanedMedia(mediaItems, supabase)
    throw new PostServiceError('Failed to create post', 500, createError)
  }

  const createResult = result?.[0]

  if (!createResult?.success) {
    await cleanupOrphanedMedia(mediaItems, supabase)
    const errorMessage = (createResult as { error_message?: string })?.error_message
    throw new PostServiceError(errorMessage || 'Failed to create post', 400)
  }

  const { data: createdPost, error: fetchError } = await supabase
    .from('posts')
    .select(
      `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        community:communities(name, slug)
      `
    )
    .eq('id', (createResult as { post_id?: string })?.post_id || '')
    .single()

  let mediaItemsForResponse: unknown[] = []

  const mediaCount = (createResult as { media_count?: number })?.media_count || 0
  if (mediaCount > 0) {
    const { data: mediaData, error: mediaError } = await supabase
      .from('media_items')
      .select('*')
      .eq('owner_type', 'post')
      .eq('owner_id', (createResult as { post_id?: string })?.post_id || '')
      .order('display_order', { ascending: true })

    if (mediaError) {
      throw new PostServiceError('Failed to fetch post media', 500, mediaError)
    }

    mediaItemsForResponse = mediaData || []
  }

  if (fetchError || !createdPost) {
    return {
      message: `Post created successfully${mediaCount > 0 ? ` with ${mediaCount} media attachment${mediaCount > 1 ? 's' : ''}` : ''}`,
      data: {
        id: (createResult as { post_id?: string })?.post_id || '',
        media_count: mediaCount,
      },
    }
  }

  return {
    message: `Post created successfully${mediaCount > 0 ? ` with ${mediaCount} media attachment${mediaCount > 1 ? 's' : ''}` : ''}`,
    data: {
      ...createdPost,
      media_items: mediaItemsForResponse,
    },
  }
}

function validateExternalUrl(externalUrl: string) {
  let parsed: URL
  try {
    parsed = new URL(externalUrl)
  } catch {
    throw new PostServiceError('Invalid external URL format', 400)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new PostServiceError('External URL must use HTTP or HTTPS protocol', 400)
  }

  const suspiciousPatterns = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:']
  const lowerUrl = externalUrl.toLowerCase()

  if (suspiciousPatterns.some((pattern) => lowerUrl.includes(pattern))) {
    throw new PostServiceError('Invalid external URL format', 400)
  }

  const hostname = parsed.hostname.toLowerCase()
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', 'malware.com', 'phishing.com']

  if (
    blockedHosts.includes(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
    throw new PostServiceError('External URLs to local/private networks are not allowed', 400)
  }

  if (externalUrl.length > 2048) {
    throw new PostServiceError('External URL is too long (max 2048 characters)', 400)
  }
}

async function validateMediaItems(
  mediaItems: CreatePostInput['media_items'],
  supabase: SupabaseClient
) {
  if (!mediaItems) return

  for (const mediaItem of mediaItems) {
    if (!mediaItem.url) {
      throw new PostServiceError('Invalid media item: missing URL', 400)
    }

    let mediaUrl: URL
    try {
      mediaUrl = new URL(mediaItem.url)
    } catch {
      throw new PostServiceError(`Invalid media URL format: ${mediaItem.url}`, 400)
    }

    const urlPath = mediaUrl.pathname
    if (!urlPath.includes('/storage/v1/object/public/')) {
      throw new PostServiceError('Media URL must be from Supabase storage', 400)
    }

    const pathParts = urlPath.split('/storage/v1/object/public/')
    if (pathParts.length !== 2) {
      throw new PostServiceError('Invalid storage URL format', 400)
    }

    const bucket = pathParts[1]?.split('/')[0]
    const filePath = pathParts[1]?.split('/').slice(1).join('/')

    if (!bucket || !filePath) {
      throw new PostServiceError('Invalid storage URL format', 400)
    }

    const { error: fileError } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/') || '', {
        limit: 1,
        search: filePath.split('/').pop() || '',
      })

    if (fileError) {
      logger.warn('Storage check error:', fileError)
    }

    if (mediaItem.media_type && !['image', 'video', 'gif'].includes(mediaItem.media_type)) {
      throw new PostServiceError(`Invalid media type: ${mediaItem.media_type}`, 400)
    }

    if (
      mediaItem.file_size !== undefined &&
      mediaItem.file_size !== null &&
      mediaItem.file_size < 0
    ) {
      throw new PostServiceError('Invalid file size', 400)
    }

    if (urlPath.includes('..') || urlPath.includes('//') || urlPath.includes('?')) {
      throw new PostServiceError('Invalid file path in URL', 400)
    }
  }
}
