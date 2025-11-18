import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * PUT /api/communities/[slug]/edit - Update community info (admin only)
 *
 * @param request - Next.js request with update data
 * @param params - Route parameters with slug
 * @returns Updated community
 */
export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const logger = createAPILogger('PUT', `/api/communities/${params.slug}/edit`)

  try {
    const body = await request.json()
    const { name, description, rules, is_private } = body

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Updating community', { userId: user.id, slug: params.slug })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', params.slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    // Verify user is admin of this community
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw APIErrors.forbidden()
    }

    // Update community
    interface CommunityUpdateData {
      name?: string
      description?: string | null
      rules?: string | null
      is_private?: boolean
      updated_at: string
    }
    const updateData: CommunityUpdateData = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (rules !== undefined) updateData.rules = rules
    if (is_private !== undefined) updateData.is_private = is_private

    const { data: updatedCommunity, error: updateError } = await supabase
      .from('communities')
      .update(updateData)
      .eq('id', community.id)
      .select()
      .single()

    if (updateError) throw updateError

    logger.info('Community updated successfully', {
      communityId: community.id,
      userId: user.id,
    })

    return createSuccessResponse(updatedCommunity, {
      message: 'Community updated successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/communities/${params.slug}/edit`,
    })
  }
})
