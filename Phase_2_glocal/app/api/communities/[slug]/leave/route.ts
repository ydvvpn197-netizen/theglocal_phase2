import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * DELETE /api/communities/[slug]/leave - Leave a community
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug
 * @returns Success response
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const logger = createAPILogger('DELETE', `/api/communities/${params.slug}/leave`)

  try {
    const { slug } = params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('User leaving community', { userId: user.id, slug })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, created_by')
      .eq('slug', slug)
      .single()

    if (communityError) throw communityError

    if (!community) {
      throw APIErrors.notFound('Community')
    }

    // Prevent creator from leaving (they must transfer ownership first)
    if (community.created_by === user.id) {
      throw APIErrors.forbidden()
    }

    // Leave community
    const { error: leaveError } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('user_id', user.id)

    if (leaveError) throw leaveError

    logger.info('User left community successfully', {
      userId: user.id,
      communityId: community.id,
    })

    return createSuccessResponse(null, {
      message: `Left ${community.name} successfully`,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/communities/${params.slug}/leave`,
    })
  }
})
