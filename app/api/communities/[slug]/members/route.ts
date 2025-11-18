import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'

import { withRateLimit } from '@/lib/middleware/with-rate-limit'
/**
 * GET /api/communities/[slug]/members - Get community members
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug
 * @returns List of community members
 */
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const logger = createAPILogger('GET', `/api/communities/${params.slug}/members`)

  try {
    const supabase = await createClient()

    logger.info('Fetching community members', { slug: params.slug })

    // Get community by slug
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', params.slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    // Get members with user info
    const { data: members, error } = await supabase
      .from('community_members')
      .select('*, users!community_members_user_id_fkey(anonymous_handle)')
      .eq('community_id', community.id)
      .order('joined_at', { ascending: false })

    if (error) throw error

    logger.info('Community members fetched successfully', {
      communityId: community.id,
      memberCount: members?.length || 0,
    })

    return createSuccessResponse(members || [])
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/communities/${params.slug}/members`,
    })
  }
})
