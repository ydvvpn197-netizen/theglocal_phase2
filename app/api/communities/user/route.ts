import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/communities/user - Get communities that the current user is a member of
 *
 * @param _request - Next.js request
 * @returns List of user's communities
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/communities/user')

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Fetching user communities', { userId: user.id })

    // Get user's communities
    const { data, error } = await supabase
      .from('community_members')
      .select(
        `
        community_id,
        role,
        communities!inner(
          id,
          name,
          slug,
          description,
          member_count,
          location_city
        )
      `
      )
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (error) throw error

    // Transform data to include community info
    interface MembershipWithCommunity {
      community_id: string
      role: string
      communities:
        | {
            id: string
            name: string
            slug: string
            description: string | null
            member_count: number
            location_city: string | null
          }
        | {
            id: string
            name: string
            slug: string
            description: string | null
            member_count: number
            location_city: string | null
          }[]
    }
    const typedData = data as unknown as MembershipWithCommunity[] | null
    const userCommunities =
      typedData?.map((membership) => {
        const community = Array.isArray(membership.communities)
          ? membership.communities[0]
          : membership.communities
        if (!community) {
          throw new Error('Community data is missing')
        }
        return {
          id: community.id,
          name: community.name,
          slug: community.slug,
          description: community.description,
          member_count: community.member_count,
          location_city: community.location_city,
          role: membership.role,
        }
      }) || []

    logger.info('User communities fetched successfully', {
      userId: user.id,
      count: userCommunities.length,
    })

    return createSuccessResponse(userCommunities)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/communities/user',
    })
  }
})
