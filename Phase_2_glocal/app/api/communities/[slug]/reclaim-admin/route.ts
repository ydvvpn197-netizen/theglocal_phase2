import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/communities/[slug]/reclaim-admin
 * Allows community creators to reclaim admin access if they're not a member
 * This handles the edge case where community creation partially failed
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug
 * @returns Success response with admin access details
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const logger = createAPILogger('POST', `/api/communities/${slug}/reclaim-admin`)

  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Reclaiming admin access', { userId: user.id, slug })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, slug, created_by')
      .eq('slug', slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    // Verify user is the creator
    if (community.created_by !== user.id) {
      throw APIErrors.forbidden()
    }

    // Check if already a member using admin client to bypass RLS
    const { data: existing, error: checkError } = await adminClient
      .from('community_members')
      .select('id, role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    if (existing) {
      if (existing.role === 'admin') {
        throw APIErrors.conflict('You are already an admin of this community')
      }

      // User is a member but not admin - upgrade to admin
      const { error: upgradeError } = await adminClient
        .from('community_members')
        .update({ role: 'admin' })
        .eq('id', existing.id)

      if (upgradeError) {
        throw upgradeError
      }

      logger.info('User role upgraded to admin', {
        userId: user.id,
        communityId: community.id,
      })

      return createSuccessResponse(
        {
          role: 'admin',
          community_id: community.id,
          community_name: community.name,
        },
        {
          message: 'Your role has been upgraded to admin',
          action: 'upgraded',
        }
      )
    }

    // User is not a member - add as admin using admin client
    const { data: membership, error: addError } = await adminClient
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'admin',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (addError) {
      // Handle specific errors
      if (addError.code === '23505') {
        throw APIErrors.conflict('Membership already exists')
      }

      throw addError
    }

    logger.info('Admin access reclaimed successfully', {
      communityId: community.id,
      userId: user.id,
      membershipId: membership.id,
    })

    return createSuccessResponse(
      {
        role: 'admin',
        community_id: community.id,
        community_name: community.name,
      },
      {
        message: `Successfully reclaimed admin access to ${community.name}`,
        action: 'reclaimed',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/communities/${slug}/reclaim-admin`,
    })
  }
})
