import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/artists - List artists
 *
 * @param request - Next.js request with query parameters
 * @returns List of artists
 */
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/artists')

  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    logger.info('Fetching artists', { city, category, search, limit, offset })

    const supabase = await createClient()

    let query = supabase
      .from('artists')
      .select('*')
      .in('subscription_status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (city) {
      query = query.eq('location_city', city)
    }

    if (category && category !== 'all') {
      query = query.eq('service_category', category)
    }

    // Search functionality
    if (search) {
      query = query.or(
        `stage_name.ilike.%${search}%,description.ilike.%${search}%,service_category.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    logger.info('Artists fetched successfully', { count: data?.length || 0 })

    return createSuccessResponse(data || [])
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/artists',
    })
  }
})

/**
 * POST /api/artists - Create artist profile
 *
 * @param request - Next.js request with artist data
 * @returns Created artist profile
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/artists')

  try {
    const body = await request.json()
    const {
      stage_name,
      service_category,
      description,
      location_city,
      rate_min,
      rate_max,
      portfolio_images,
    } = body

    if (!stage_name || !service_category || !location_city) {
      throw APIErrors.badRequest('stage_name, service_category, and location_city are required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Creating artist profile', {
      userId: user.id,
      stage_name: stage_name.substring(0, 50),
      service_category,
    })

    // Check if user already has an artist profile
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingArtist) {
      throw APIErrors.badRequest('You already have an artist profile')
    }

    // Create artist profile
    const { data: artist, error: createError } = await supabase
      .from('artists')
      .insert({
        user_id: user.id,
        stage_name,
        service_category,
        description,
        location_city,
        rate_min,
        rate_max,
        portfolio_images,
        subscription_status: 'trial', // Start with trial status
      })
      .select()
      .single()

    if (createError) throw createError

    logger.info('Artist profile created successfully', {
      artistId: artist.id,
      userId: user.id,
    })

    return createSuccessResponse(artist, {
      message: 'Artist profile created successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/artists',
    })
  }
})
