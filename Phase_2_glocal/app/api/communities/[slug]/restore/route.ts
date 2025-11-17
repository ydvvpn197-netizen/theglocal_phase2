import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isCommunityAdmin, isSuperAdmin } from '@/lib/utils/permissions'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/communities/[slug]/restore - Restore a deleted community
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug
 * @returns Success response with restoration details
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const logger = createAPILogger('POST', `/api/communities/${slug}/restore`)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Restoring community', { userId: user.id, slug })

    // Use admin client to get community details (bypasses RLS)
    const adminClient = createAdminClient()
    const { data: community, error: communityError } = await adminClient
      .from('communities')
      .select('id, name, slug, is_deleted, deletion_scheduled_for, deleted_at')
      .eq('slug', slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    if (!community.is_deleted) {
      throw APIErrors.badRequest('Community is not deleted')
    }

    // Check if recovery window has expired
    if (
      community.deletion_scheduled_for &&
      new Date(community.deletion_scheduled_for) < new Date()
    ) {
      const expiredTime = new Date(community.deletion_scheduled_for).toLocaleString()
      logger.warn('Recovery window expired', { expiredTime })
      throw APIErrors.badRequest(
        `Recovery window has expired. Community cannot be restored. Recovery window expired at ${expiredTime}`
      )
    }

    // Check permissions: community admin or super admin
    // Use adminClient to ensure we can check permissions for deleted communities
    const isAdmin = await isCommunityAdmin(user.id, community.id).catch(() => false)
    const isSuperUser = await isSuperAdmin(user.id).catch(() => false)

    if (!isAdmin && !isSuperUser) {
      throw APIErrors.forbidden()
    }

    // Call the restore function using admin client
    const { data: restoreResult, error: restoreError } = await adminClient.rpc(
      'restore_deleted_community',
      {
        community_id_param: community.id,
      }
    )

    if (restoreError) {
      throw restoreError
    }

    interface RestoreResult {
      success?: boolean
      error?: string
      posts_restored?: number
    }
    const result = restoreResult as RestoreResult | null

    if (!result || !result.success) {
      throw APIErrors.badRequest(result?.error || 'Failed to restore community')
    }

    logger.info('Community restored successfully', {
      communityId: community.id,
      communityName: community.name,
      postsRestored: result.posts_restored,
    })

    return createSuccessResponse(
      {
        postsRestored: result.posts_restored,
        communityName: community.name,
      },
      {
        message: 'Community has been restored successfully',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/communities/${slug}/restore`,
    })
  }
})
