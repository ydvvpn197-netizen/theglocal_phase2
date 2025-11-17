import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/feed - Location-based feed with proximity search support
 *
 * Query params:
 * - mode: 'joined' (posts from joined communities) or 'nearby' (posts from communities within radius)
 * - lat, lng, radius: Proximity search for nearby mode
 * - city: Fallback city filter
 * - sort: 'recent' or 'popular'
 * - limit, offset: Pagination
 *
 * Response includes distance_km when using proximity search
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/v2/feed')
  const searchParams = _request.nextUrl.searchParams

  // Mode selection
  const mode = searchParams.get('mode') || 'joined' // 'joined' or 'nearby'

  // Location parameters
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = parseFloat(searchParams.get('radius') || '25')
  const city = searchParams.get('city')

  // Filter parameters
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const sort = searchParams.get('sort') || 'recent' // 'recent' or 'popular'

  try {
    // Get current user with regular client for auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Use admin client for main query to bypass RLS issues
    const adminSupabase = createAdminClient()

    let posts: unknown[] = []
    let error: Error | null = null

    // MODE 1: Posts from joined communities
    if (mode === 'joined' && user) {
      // Use admin client to bypass RLS for community_members query
      const { data: joinedCommunities } = await adminSupabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)

      if (joinedCommunities && joinedCommunities.length > 0) {
        const communityIds = joinedCommunities.map((m) => m.community_id)

        let query = adminSupabase
          .from('posts')
          .select(
            `
            *,
            users!author_id(anonymous_handle, avatar_seed),
            communities(name, slug, location_city, location_coordinates)
          `
          )
          .eq('is_deleted', false)
          .in('community_id', communityIds)

        // Location filtering (optional for joined mode)
        if (city && city.trim() !== '') {
          query = query.eq('location_city', city)
        }

        // Sorting
        if (sort === 'popular') {
          query = query.order('upvotes', { ascending: false })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        // Pagination
        query = query.range(offset, offset + limit - 1)

        const { data, error: queryError } = await query
        posts = data || []
        error = queryError
      }
    }
    // MODE 2: Posts from nearby communities (proximity search)
    else if (mode === 'nearby' && lat && lng) {
      // First, get nearby communities
      const { data: nearbyCommunities, error: communityError } = await adminSupabase.rpc(
        'get_communities_within_radius',
        {
          user_lat: parseFloat(lat),
          user_lng: parseFloat(lng),
          radius_km: radius,
          limit_count: 100, // Get up to 100 nearby communities
        }
      )

      if (communityError) {
        throw communityError
      }

      if (nearbyCommunities && nearbyCommunities.length > 0) {
        interface CommunityWithId {
          id: string
          distance_km?: number
          [key: string]: unknown
        }
        const communityIds = (nearbyCommunities as CommunityWithId[]).map((c) => c.id)

        let query = adminSupabase
          .from('posts')
          .select(
            `
            *,
            users!author_id(anonymous_handle, avatar_seed),
            communities(name, slug, location_city, location_coordinates)
          `
          )
          .eq('is_deleted', false)
          .in('community_id', communityIds)

        // Sorting
        if (sort === 'popular') {
          query = query.order('upvotes', { ascending: false })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        // Get more than needed for client-side distance calculation and pagination
        query = query.limit(200)

        const { data, error: queryError } = await query
        posts = data || []
        error = queryError

        // Enrich with distance from community
        if (posts.length > 0) {
          const communityDistances = new Map(
            (nearbyCommunities as CommunityWithId[]).map((c) => [c.id, c.distance_km])
          )

          interface PostWithCommunity {
            community_id: string
            distance_km?: number | null
            upvotes?: number
            created_at: string
            [key: string]: unknown
          }

          posts = (posts as PostWithCommunity[]).map((post) => ({
            ...post,
            distance_km: communityDistances.get(post.community_id) || null,
          }))

          // Sort by distance if available
          ;(posts as PostWithCommunity[]).sort((a, b) => {
            const distA = a.distance_km ?? Infinity
            const distB = b.distance_km ?? Infinity
            if (distA === distB) {
              // Secondary sort by created_at or upvotes
              if (sort === 'popular') {
                return (b.upvotes || 0) - (a.upvotes || 0)
              }
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            }
            return distA - distB
          })

          // Apply pagination
          posts = posts.slice(offset, offset + limit)
        }
      }
    }
    // MODE 3: Fallback - public feed from all communities
    else {
      let query = adminSupabase
        .from('posts')
        .select(
          `
          *,
          users!author_id(anonymous_handle, avatar_seed),
          communities(name, slug, location_city, location_coordinates)
        `
        )
        .eq('is_deleted', false)

      // Location filtering
      if (city && city.trim() !== '') {
        query = query.eq('location_city', city)
      }

      // Sorting
      if (sort === 'popular') {
        query = query.order('upvotes', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // Pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error: queryError } = await query
      posts = data || []
      error = queryError
    }

    if (error) throw error

    // Process data to flatten the joined tables and add user votes
    let processedData = posts || []
    if (posts && posts.length > 0) {
      // Fetch user votes for these posts if user is authenticated
      let votesMap = new Map<string, string>()
      if (user) {
        interface PostWithId {
          id: string
          [key: string]: unknown
        }
        const postIds = (posts as PostWithId[]).map((post) => post.id)
        const { data: userVotes } = await adminSupabase
          .from('votes')
          .select('content_id, vote_type')
          .eq('user_id', user.id)
          .eq('content_type', 'post')
          .in('content_id', postIds)

        interface Vote {
          content_id: string
          vote_type: string
        }
        votesMap = new Map(
          (userVotes as Vote[] | null)?.map((v) => [v.content_id, v.vote_type]) || []
        )
      }

      // Fetch media items for posts
      interface PostWithId {
        id: string
        [key: string]: unknown
      }
      const postIds = (posts as PostWithId[]).map((post) => post.id)
      const { data: mediaItems, error: mediaError } = await adminSupabase
        .from('media_items')
        .select('*')
        .eq('owner_type', 'post')
        .in('owner_id', postIds)
        .order('display_order', { ascending: true })

      // Group media by post ID
      interface MediaItem {
        owner_id: string
        [key: string]: unknown
      }
      const mediaByPost = new Map<string, MediaItem[]>()
      if (mediaError) {
        logger.warn('Feed (v2): Media items fetch error (non-fatal)', { error: mediaError.message })
      } else if (mediaItems) {
        ;(mediaItems as MediaItem[]).forEach((media) => {
          if (!media || !media.owner_id) {
            logger.warn('Feed (v2): Invalid media item:', media)
            return
          }

          if (!mediaByPost.has(media.owner_id)) {
            mediaByPost.set(media.owner_id, [])
          }
          const existingMedia = mediaByPost.get(media.owner_id) || []
          existingMedia.push(media)
          mediaByPost.set(media.owner_id, existingMedia)
        })
      }

      interface PostWithRelations {
        id: string
        users?: unknown
        communities?: unknown
        [key: string]: unknown
      }

      processedData = (posts as PostWithRelations[]).map((post) => ({
        ...post,
        author: post.users,
        community: post.communities,
        user_vote: votesMap.get(post.id) || null,
        media_items: mediaByPost.get(post.id) || [],
      }))
    }

    return NextResponse.json({
      success: true,
      data: processedData,
      meta: {
        count: processedData.length,
        limit,
        offset,
        sort,
        mode,
        filters: {
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          radius,
          city,
        },
        hasProximitySearch: mode === 'nearby' && !!(lat && lng),
        isAuthenticated: !!user,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/feed' })
  }
})
