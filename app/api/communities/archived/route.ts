import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

/**
 * GET /api/communities/archived - List deleted communities where user was admin
 *
 * @param _request - Next.js request
 * @returns List of archived communities
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/communities/archived')

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Fetching archived communities', { userId: user.id })

    logger.info('[Archived Communities] User authenticated', { userId: user.id })

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Get all deleted communities where user was/is an admin
    // First, get community IDs where user is admin
    const { data: adminMemberships, error: memberError } = await adminClient
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')

    if (memberError) {
      throw memberError
    }

    if (!adminMemberships || adminMemberships.length === 0) {
      logger.info('User has no admin memberships')
      return createSuccessResponse([], {
        message: 'No archived communities found',
      })
    }

    // Get deleted communities from those admin memberships
    const adminCommunityIds = adminMemberships.map((m) => m.community_id)
    const { data: communities, error: communitiesError } = await adminClient
      .from('communities')
      .select(
        `
        id,
        name,
        slug,
        description,
        location_city,
        member_count,
        post_count,
        is_private,
        is_featured,
        created_at,
        is_deleted,
        deleted_at,
        deleted_by,
        deletion_scheduled_for
      `
      )
      .in('id', adminCommunityIds)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    if (communitiesError) {
      throw communitiesError
    }

    // Add user role and membership info
    const enrichedCommunities =
      communities?.map((community) => ({
        ...community,
        user_role: 'admin',
        is_member: true,
      })) || []

    logger.info('Archived communities fetched successfully', {
      count: enrichedCommunities.length,
    })

    return createSuccessResponse(enrichedCommunities, {
      message: 'Archived communities fetched successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/communities/archived',
    })
  }
})
