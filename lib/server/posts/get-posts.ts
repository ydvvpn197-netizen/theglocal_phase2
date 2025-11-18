import type { SupabaseClient } from '@supabase/supabase-js'
import { PostServiceError } from './errors'

interface FetchPostsOptions {
  communityId?: string | null
  limit: number
  offset: number
  userId?: string | null
}

type UnknownRecord = Record<string, unknown>

interface CommunityPostRecord extends UnknownRecord {
  id: string
  community_id?: string | null
  author_id?: string | null
  author_handle: string
  author_avatar_seed: string
}

export async function fetchPosts(
  supabase: SupabaseClient,
  { communityId, limit, offset, userId }: FetchPostsOptions
): Promise<UnknownRecord[]> {
  if (communityId) {
    return fetchCommunityPosts(supabase, {
      communityId,
      limit,
      offset,
      userId: userId ?? null,
    })
  }

  return fetchGlobalPosts(supabase, { limit, offset, userId })
}

async function fetchCommunityPosts(
  supabase: SupabaseClient,
  {
    communityId,
    limit,
    offset,
    userId,
  }: Required<Pick<FetchPostsOptions, 'communityId' | 'limit' | 'offset' | 'userId'>>
): Promise<UnknownRecord[]> {
  const { data: rawCommunityPosts, error: optimizedError } = await supabase.rpc(
    'get_community_posts',
    {
      p_community_id: communityId,
      p_user_id: userId || null,
      p_limit: limit,
      p_offset: offset,
      p_include_pinned: true,
    }
  )

  if (optimizedError) {
    throw new PostServiceError('Failed to fetch community posts', 500, optimizedError)
  }

  const optimizedData = (rawCommunityPosts || []) as CommunityPostRecord[]

  if (!optimizedData || optimizedData.length === 0) {
    return []
  }

  const postIds = optimizedData.map((post: { id: string }) => post.id)

  const { data: mediaItems, error: mediaError } = await supabase
    .from('media_items')
    .select('*')
    .eq('owner_type', 'post')
    .in('owner_id', postIds)
    .order('display_order', { ascending: true })

  if (mediaError) {
    throw new PostServiceError('Failed to fetch media items', 500, mediaError)
  }

  const mediaByPost = new Map<string, UnknownRecord[]>()
  if (Array.isArray(mediaItems)) {
    mediaItems.forEach((media) => {
      const ownerId = (media as { owner_id?: string })?.owner_id
      if (!ownerId) return
      const existing = mediaByPost.get(ownerId) || []
      existing.push(media as UnknownRecord)
      mediaByPost.set(ownerId, existing)
    })

    mediaByPost.forEach((items, key) => {
      mediaByPost.set(
        key,
        items.sort(
          (a, b) =>
            ((a.display_order as number | undefined) ?? 0) -
            ((b.display_order as number | undefined) ?? 0)
        )
      )
    })
  }

  const communityIds = Array.from(
    new Set(
      optimizedData
        .map((post: CommunityPostRecord) => post.community_id ?? null)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  const communityMap = new Map<string, { name: string; slug: string }>()
  if (communityIds.length > 0) {
    const { data: communities } = await supabase
      .from('communities')
      .select('id, name, slug')
      .in('id', communityIds)

    communities?.forEach((community) => {
      const communityId = (community as { id?: string; name?: string; slug?: string })?.id
      const communityName = (community as { name?: string })?.name || ''
      const communitySlug = (community as { slug?: string })?.slug || ''
      if (!communityId) return
      communityMap.set(communityId, {
        name: communityName,
        slug: communitySlug,
      })
    })
  }

  return optimizedData.map((post: CommunityPostRecord) => ({
    ...post,
    author_id: post.author_id || userId || null,
    media_items: mediaByPost.get(post.id) || [],
    author: {
      anonymous_handle: post.author_handle,
      avatar_seed: post.author_avatar_seed,
    },
    community: post.community_id
      ? (communityMap.get(post.community_id) ?? { name: '', slug: '' })
      : { name: '', slug: '' },
  }))
}

async function fetchGlobalPosts(
  supabase: SupabaseClient,
  { limit, offset, userId }: Omit<FetchPostsOptions, 'communityId'> & { userId?: string | null }
): Promise<UnknownRecord[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        community:communities(name, slug),
        media_items:media_items(*)
      `
    )
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new PostServiceError('Failed to fetch posts', 500, error)
  }

  const normalizedData = (data || []).map((post: unknown) => {
    if (!post || typeof post !== 'object') {
      return post
    }
    const postRecord = post as Record<string, unknown>
    const mediaItems = Array.isArray(postRecord.media_items) ? postRecord.media_items : []
    const sortedMedia = mediaItems
      .filter((item: unknown) => item && typeof item === 'object')
      .sort((a: unknown, b: unknown) => {
        const aRecord = a as Record<string, unknown>
        const bRecord = b as Record<string, unknown>
        return (
          ((aRecord.display_order as number | undefined) ?? 0) -
          ((bRecord.display_order as number | undefined) ?? 0)
        )
      })

    return {
      ...postRecord,
      media_items: sortedMedia,
    }
  })

  if (!userId || normalizedData.length === 0) {
    return normalizedData as UnknownRecord[]
  }

  const postIds = normalizedData
    .filter((post): post is { id: string } => {
      return (
        post !== null &&
        post !== undefined &&
        typeof post === 'object' &&
        'id' in post &&
        typeof (post as { id: unknown }).id === 'string'
      )
    })
    .map((post) => post.id)
  const { data: userVotes, error: votesError } = await supabase
    .from('votes')
    .select('content_id, vote_type')
    .eq('user_id', userId)
    .eq('content_type', 'post')
    .in('content_id', postIds)

  if (votesError) {
    throw new PostServiceError('Failed to fetch user votes', 500, votesError)
  }

  const votesMap = new Map(userVotes?.map((vote) => [vote.content_id, vote.vote_type]) || [])

  return normalizedData.map((post: unknown): UnknownRecord => {
    if (!post || typeof post !== 'object') {
      return post as UnknownRecord
    }
    const postRecord = post as Record<string, unknown>
    return {
      ...postRecord,
      user_vote: votesMap.get(String(postRecord.id ?? '')) || null,
    }
  })
}
