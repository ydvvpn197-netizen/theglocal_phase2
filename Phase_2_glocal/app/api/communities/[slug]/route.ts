import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/communities/[slug] - Get community by slug
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug
 * @returns Community data with membership status
 */
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const logger = createAPILogger('GET', `/api/communities/${slug}`)

    logger.info('Fetching community', { slug })

    const supabase = await createClient()

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()

    if (communityError) throw communityError

    if (!community) {
      throw APIErrors.notFound('Community')
    }

    // Check if user is a member
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let isMember = false
    let isAdmin = false

    if (user) {
      const { data: membership } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single()

      isMember = !!membership
      isAdmin = membership?.role === 'admin' || membership?.role === 'moderator'
    }

    logger.info('Community fetched successfully', {
      communityId: community.id,
      isMember,
      isAdmin,
    })

    return createSuccessResponse({
      community,
      isMember,
      isAdmin,
    })
  } catch (error) {
    const { slug: errorSlug } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/communities/${errorSlug}`,
    })
  }
})
