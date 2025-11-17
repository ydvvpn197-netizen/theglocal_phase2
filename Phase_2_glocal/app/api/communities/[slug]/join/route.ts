import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/communities/[slug]/join - Join a community
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug
 * @returns Success response
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const logger = createAPILogger('POST', `/api/communities/${slug}/join`)
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('User joining community', { userId: user.id, slug })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, is_private')
      .eq('slug', slug)
      .single()

    if (communityError) throw communityError

    if (!community) {
      throw APIErrors.notFound('Community')
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      throw APIErrors.conflict('Already a member of this community')
    }

    // Join community
    const { error: joinError } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'member',
    })

    if (joinError) throw joinError

    logger.info('User joined community successfully', {
      userId: user.id,
      communityId: community.id,
    })

    return createSuccessResponse(null, {
      message: `Joined ${community.name} successfully`,
    })
  } catch (error) {
    const { slug: errorSlug } = await params
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/communities/${errorSlug}/join`,
    })
  }
})
