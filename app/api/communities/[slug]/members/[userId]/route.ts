import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isCommunityAdmin, canChangeRole, countCommunityAdmins } from '@/lib/utils/permissions'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * PATCH /api/communities/[slug]/members/[userId] - Update member role
 *
 * @param _request - Next.js request with role data
 * @param params - Route parameters with slug and userId
 * @returns Updated member data
 */
export const PATCH = withRateLimit(async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug: communitySlug, userId } = await params
  const logger = createAPILogger('PATCH', `/api/communities/${communitySlug}/members/${userId}`)

  try {
    const body = await _request.json()
    const { role } = body

    if (!role || !['member', 'moderator', 'admin'].includes(role)) {
      throw APIErrors.badRequest('Invalid role')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Updating member role', {
      userId: user.id,
      targetUserId: userId,
      newRole: role,
      slug: communitySlug,
    })

    // Get community with creator info
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, created_by')
      .eq('slug', communitySlug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    const isCreator = community.created_by === user.id

    // Get requester's membership and role
    const { data: requesterMembership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single()

    const requesterRole = requesterMembership?.role as 'admin' | 'moderator' | 'member' | null

    // Get target user's current role
    const { data: targetMembership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .single()

    if (!targetMembership) {
      throw APIErrors.notFound('Member')
    }

    const targetCurrentRole = targetMembership.role

    // Check if the role is already set
    if (targetCurrentRole === role) {
      throw APIErrors.badRequest(`Member already has the ${role} role`)
    }

    // Check permissions - verify requester has admin role
    if (requesterRole !== 'admin' && !isCreator) {
      throw APIErrors.forbidden()
    }

    // Check if role change is allowed (prevent removing last admin)
    const allowed = await canChangeRole(community.id, userId, role, supabase)
    if (!allowed) {
      throw APIErrors.forbidden()
    }

    // Check admin limit (soft limit - warn but allow)
    let warning: string | undefined
    if (role === 'admin') {
      const adminCount = await countCommunityAdmins(community.id, supabase)
      if (adminCount >= 50) {
        warning =
          'Admin limit reached (50). Consider removing inactive admins to keep the team manageable.'
      }
    }

    // Update member role and verify the change
    const { data: updatedMember, error: updateError } = await supabase
      .from('community_members')
      .update({ role })
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .select('role, user_id')
      .single()

    if (updateError) {
      logger.error(
        '[Update Member Role] Update error:',
        updateError instanceof Error ? updateError : undefined
      )
      throw updateError
    }

    if (!updatedMember) {
      throw new Error('Role update failed - no member data returned')
    }

    if (updatedMember.role !== role) {
      logger.error(
        `[Update Member Role] Role mismatch: expected ${role}, got ${updatedMember.role}`
      )
      throw new Error(`Role update failed - expected ${role} but got ${updatedMember.role}`)
    }

    // Create notification for the user whose role changed
    const roleLabels: Record<string, string> = {
      admin: 'an Admin',
      moderator: 'a Moderator',
      member: 'a Member',
    }

    try {
      const adminSupabase = createAdminClient()
      const { error: notificationError } = await adminSupabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'community_role_change',
        p_title: 'Your community role changed',
        p_message: `You are now ${roleLabels[role]} in ${community.name}`,
        p_link: `/communities/${communitySlug}?tab=members`,
        p_actor_id: user.id,
        p_entity_id: community.id,
        p_entity_type: 'community',
      })

      if (notificationError) {
        logger.error(
          '[Update Member Role] Notification error:',
          notificationError instanceof Error ? notificationError : undefined
        )
      }
    } catch (error) {
      // Log notification error but don't fail the role update
      logger.warn('[Update Member Role] Failed to create notification', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    logger.info('Member role updated successfully', {
      userId: user.id,
      targetUserId: userId,
      newRole: role,
      communityId: community.id,
    })

    return createSuccessResponse(updatedMember, {
      message: `Member role updated to ${role}`,
      ...(warning && { warning }),
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PATCH',
      path: `/api/communities/${communitySlug}/members/${userId}`,
    })
  }
})

/**
 * DELETE /api/communities/[slug]/members/[userId] - Remove member (admin only)
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug and userId
 * @returns Success response
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug: communitySlug, userId } = await params
  const logger = createAPILogger('DELETE', `/api/communities/${communitySlug}/members/${userId}`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Removing member', {
      userId: user.id,
      targetUserId: userId,
      slug: communitySlug,
    })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, created_by')
      .eq('slug', communitySlug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    // Prevent removing the community creator
    if (community.created_by === userId) {
      throw APIErrors.forbidden()
    }

    // Check if current user is admin (checks both creator and membership)
    const isAdmin = await isCommunityAdmin(user.id, community.id)

    if (!isAdmin) {
      throw APIErrors.forbidden()
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    logger.info('Member removed successfully', {
      userId: user.id,
      targetUserId: userId,
      communityId: community.id,
    })

    return createSuccessResponse(null, {
      message: 'Member removed from community',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/communities/${communitySlug}/members/${userId}`,
    })
  }
})
