import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCommunityAdmin } from '@/lib/utils/permissions'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/communities/[slug]/members/[userId]/ban - Ban a member
 *
 * @param _request - Next.js request with ban reason and duration
 * @param params - Route parameters with slug and userId
 * @returns Success response
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug, userId } = await params
  const logger = createAPILogger('POST', `/api/communities/${slug}/members/${userId}/ban`)

  try {
    const body = await _request.json()
    const { reason, duration } = body // duration in days, null for permanent

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Banning member', { userId: user.id, targetUserId: userId, slug })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, created_by')
      .eq('slug', slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    // Prevent banning the community creator
    if (community.created_by === userId) {
      throw APIErrors.forbidden()
    }

    // Check if current user is admin (checks both creator and membership)
    const isAdmin = await isCommunityAdmin(user.id, community.id)

    if (!isAdmin) {
      throw APIErrors.forbidden()
    }

    // Calculate ban expiry
    let bannedUntil = null
    if (duration && duration > 0) {
      bannedUntil = new Date()
      bannedUntil.setDate(bannedUntil.getDate() + duration)
    }

    // Ban the member
    const { error: banError } = await supabase
      .from('community_members')
      .update({
        is_banned: true,
        ban_reason: reason || 'No reason provided',
        banned_until: bannedUntil?.toISOString() || null,
      })
      .eq('community_id', community.id)
      .eq('user_id', userId)

    if (banError) throw banError

    logger.info('Member banned successfully', {
      userId: user.id,
      targetUserId: userId,
      communityId: community.id,
      duration,
    })

    return createSuccessResponse(null, {
      message: duration ? `Member banned for ${duration} days` : 'Member permanently banned',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/communities/${slug}/members/${userId}/ban`,
    })
  }
})

/**
 * DELETE /api/communities/[slug]/members/[userId]/ban - Unban a member
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug and userId
 * @returns Success response
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug, userId } = await params
  const logger = createAPILogger('DELETE', `/api/communities/${slug}/members/${userId}/ban`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Unbanning member', { userId: user.id, targetUserId: userId, slug })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    // Check if current user is admin (checks both creator and membership)
    const isAdmin = await isCommunityAdmin(user.id, community.id)

    if (!isAdmin) {
      throw APIErrors.forbidden()
    }

    // Unban the member
    const { error: unbanError } = await supabase
      .from('community_members')
      .update({
        is_banned: false,
        ban_reason: null,
        banned_until: null,
      })
      .eq('community_id', community.id)
      .eq('user_id', userId)

    if (unbanError) throw unbanError

    logger.info('Member unbanned successfully', {
      userId: user.id,
      targetUserId: userId,
      communityId: community.id,
    })

    return createSuccessResponse(null, {
      message: 'Member unbanned successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/communities/${slug}/members/${userId}/ban`,
    })
  }
})
