import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/feed - Location-based feed aggregating posts from joined communities
 *
 * @param request - Next.js request with query parameters
 * @returns Personalized feed of posts
 */
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/feed')

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100
    const offset = parseInt(searchParams.get('offset') || '0')
    const sort = searchParams.get('sort') || 'recent' // 'recent' or 'popular'
    const city = searchParams.get('city')
    const radius = parseFloat(searchParams.get('radius') || '25') // km

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    logger.info('Fetching feed', {
      userId: user?.id || 'anonymous',
      city,
      sort,
      limit,
      offset,
    })

    let query = supabase
      .from('posts')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        community:communities!community_id(name, slug)
      `
      )
      .eq('is_deleted', false)

    // If user is authenticated, prioritize their joined communities
    if (user) {
      const { data: joinedCommunities } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)

      if (joinedCommunities && joinedCommunities.length > 0) {
        const communityIds = joinedCommunities.map((m) => m.community_id)
        query = query.in('community_id', communityIds)
      }
    }

    // Location filtering
    if (city) {
      query = query.eq('location_city', city)
    }

    // Sorting
    if (sort === 'popular') {
      // Sort by upvote ratio (upvotes - downvotes)
      query = query.order('upvotes', { ascending: false })
    } else {
      // Default: Recent
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error

    logger.info('Feed fetched successfully', {
      count: data?.length || 0,
      userId: user?.id || 'anonymous',
    })

    return createSuccessResponse(data || [], {
      count: data?.length || 0,
      limit,
      offset,
      sort,
      city,
      radius,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/feed',
    })
  }
})
