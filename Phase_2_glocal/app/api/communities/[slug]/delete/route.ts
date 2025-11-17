import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCommunityAdmin, isSuperAdmin } from '@/lib/utils/permissions'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

interface DeleteCommunityRequest {
  communityName: string
}

/**
 * DELETE /api/communities/[slug]/delete - Delete a community (admin only)
 *
 * @param _request - Next.js request with community name confirmation
 * @param params - Route parameters with slug
 * @returns Success response with deletion details
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const logger = createAPILogger('DELETE', `/api/communities/${slug}/delete`)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Get request body
    const body: DeleteCommunityRequest = await _request.json()
    const { communityName } = body

    if (!communityName || typeof communityName !== 'string') {
      throw APIErrors.badRequest('Community name confirmation is required')
    }

    logger.info('Deleting community', { userId: user.id, slug })

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, slug, is_deleted')
      .eq('slug', slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    if (community.is_deleted) {
      throw APIErrors.badRequest('Community is already deleted')
    }

    // Verify community name matches exactly
    if (community.name !== communityName.trim()) {
      throw APIErrors.badRequest(
        'Community name does not match. Please enter the exact community name.'
      )
    }

    // Check permissions: community admin or super admin
    logger.info('Checking permissions for community deletion', {
      userId: user.id,
      communityId: community.id,
      slug: community.slug,
    })

    let isAdmin = false
    let isSuperUser = false

    try {
      await requireCommunityAdmin(user.id, community.id)
      isAdmin = true
      logger.info('User confirmed as community admin', {
        userId: user.id,
        slug: community.slug,
      })
    } catch (error) {
      // If not admin, check if super admin
      if (error instanceof Error && error.message.includes('permission')) {
        // Continue to check super admin
      } else {
        throw error
      }
    }

    try {
      isSuperUser = await isSuperAdmin(user.id)
      if (isSuperUser) {
        logger.info('User confirmed as super admin', { userId: user.id })
      }
    } catch (error) {
      logger.warn('Error checking super admin status', { userId: user.id })
    }

    if (!isAdmin && !isSuperUser) {
      throw APIErrors.forbidden()
    }

    // Call the soft delete function
    const { data: deleteResult, error: deleteError } = await supabase.rpc('soft_delete_community', {
      community_id_param: community.id,
      user_id_param: user.id,
    })

    if (deleteError) {
      throw deleteError
    }

    interface DeleteResult {
      success?: boolean
      error?: string
      deleted_at?: string
      scheduled_deletion?: string | null
      posts_transferred?: number
    }
    const result = deleteResult as DeleteResult | null

    if (!result || !result.success) {
      throw APIErrors.badRequest(result?.error || 'Failed to delete community')
    }

    logger.info('Community scheduled for deletion', {
      communityId: community.id,
      userId: user.id,
      scheduledDeletion: result.scheduled_deletion,
    })

    return createSuccessResponse(
      {
        deletedAt: result.deleted_at,
        scheduledDeletion: result.scheduled_deletion,
        postsTransferred: result.posts_transferred,
        recoveryWindow: '24 hours',
      },
      {
        message: 'Community has been scheduled for deletion',
      }
    )
  } catch (error) {
    const { slug: errorSlug } = await params
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/communities/${errorSlug}/delete`,
    })
  }
})
