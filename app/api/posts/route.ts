import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/posts - List posts with optional filtering
 *
 * @param request - Next.js request with query parameters
 * @returns List of posts with author and community data
 */
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/posts')

  try {
    const searchParams = request.nextUrl.searchParams
    const communityId = searchParams.get('community_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100
    const offset = parseInt(searchParams.get('offset') || '0')

    logger.info('Fetching posts', { communityId, limit, offset })

    const supabase = await createClient()

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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (communityId) {
      query = query.eq('community_id', communityId)
    }

    const { data, error } = await query

    if (error) throw error

    logger.info('Posts fetched successfully', { count: data?.length || 0 })

    return createSuccessResponse(data || [], {
      count: data?.length || 0,
      limit,
      offset,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/posts',
    })
  }
})

/**
 * POST /api/posts - Create a new post
 *
 * @param request - Next.js request with post data
 * @returns Created post with full details
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/posts')

  try {
    const body = await request.json()
    const { community_id, title, body: postBody, image_url } = body

    if (!community_id || !title) {
      throw APIErrors.badRequest('community_id and title are required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Creating post', {
      userId: user.id,
      communityId: community_id,
      title: title.substring(0, 50),
    })

    // Verify user is a member of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      throw APIErrors.forbidden()
    }

    // Get user's location from profile
    const { data: profile } = await supabase
      .from('users')
      .select('location_city')
      .eq('id', user.id)
      .single()

    // Create post
    const { data: post, error: createError } = await supabase
      .from('posts')
      .insert({
        community_id,
        author_id: user.id,
        title,
        body: postBody,
        image_url,
        location_city: profile?.location_city,
      })
      .select()
      .single()

    if (createError) throw createError

    logger.info('Post created successfully', {
      postId: post.id,
      userId: user.id,
    })

    return createSuccessResponse(post, {
      message: 'Post created successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/posts',
    })
  }
})
