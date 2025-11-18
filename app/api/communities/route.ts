import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/communities - List communities with optional filtering
 *
 * @param request - Next.js request with query parameters
 * @returns List of communities
 */
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/communities')

  try {
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'all'
    const city = searchParams.get('city')

    logger.info('Fetching communities', { filter, city })

    const supabase = await createClient()

    let query = supabase
      .from('communities')
      .select('*')
      .eq('is_private', false) // Only public communities for now
      .order('created_at', { ascending: false })

    // Apply filters
    if (filter === 'popular') {
      query = query.order('member_count', { ascending: false })
    } else if (filter === 'nearby' && city) {
      query = query.eq('location_city', city)
    }

    const { data, error } = await query

    if (error) throw error

    logger.info('Communities fetched successfully', { count: data?.length || 0 })

    return createSuccessResponse(data || [])
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/communities',
    })
  }
})

/**
 * POST /api/communities - Create a new community
 *
 * @param request - Next.js request with community data
 * @returns Created community
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/communities')

  try {
    const body = await request.json()
    const { name, description, rules, location_city, is_private } = body

    if (!name || !location_city) {
      throw APIErrors.badRequest('Name and location_city are required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Creating community', {
      userId: user.id,
      name: name.substring(0, 50),
      location_city,
    })

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Create community
    const { data: community, error: createError } = await supabase
      .from('communities')
      .insert({
        name,
        slug,
        description,
        rules,
        location_city,
        is_private: is_private || false,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      // Handle duplicate slug
      if (createError.code === '23505') {
        throw APIErrors.conflict('A community with this name already exists in your city')
      }
      throw createError
    }

    // Add creator as admin member
    const { error: memberError } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'admin',
    })

    if (memberError) {
      // Rollback: delete community if member insert fails
      await supabase.from('communities').delete().eq('id', community.id)
      throw memberError
    }

    logger.info('Community created successfully', {
      communityId: community.id,
      userId: user.id,
    })

    return createSuccessResponse(community, {
      message: 'Community created successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/communities',
    })
  }
})
