import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/communities - List communities with proximity search support
 *
 * Query params:
 * - lat, lng, radius: Proximity search (returns distance_km)
 * - city: Fallback city filter if no coordinates provided
 * - user_id: Filter to user's joined communities
 * - limit, offset: Pagination
 *
 * Response includes distance_km when lat/lng provided
 * Filters private communities unless user is a member
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/v2/communities')
  try {
    const searchParams = _request.nextUrl.searchParams

    // Location parameters
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseFloat(searchParams.get('radius') || '50')
    const city = searchParams.get('city')

    // Filter parameters
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let data: unknown[] = []
    let error: Error | null = null

    // If user_id provided, fetch user's joined communities
    if (userId) {
      const { data: memberships, error: memberError } = await adminClient
        .from('community_members')
        .select('community:communities!inner(*)')
        .eq('user_id', userId)
        .eq('community.is_deleted', false)
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (memberError) {
        throw memberError
      }

      interface MembershipWithCommunity {
        community: Record<string, unknown> | Record<string, unknown>[]
      }
      const typedMemberships = memberships as MembershipWithCommunity[] | null
      data =
        typedMemberships?.map((m) => {
          const community = Array.isArray(m.community) ? m.community[0] : m.community
          return community as Record<string, unknown>
        }) || []

      // Add distance if coordinates provided
      if (lat && lng && data.length > 0) {
        data = await enrichWithDistance(adminClient, data, parseFloat(lat), parseFloat(lng))
      }
    }
    // Strategy 1: Proximity search if coordinates provided
    else if (lat && lng) {
      const { data: proximityData, error: proximityError } = await adminClient.rpc(
        'get_communities_within_radius',
        {
          user_lat: parseFloat(lat),
          user_lng: parseFloat(lng),
          radius_km: radius,
          limit_count: limit + offset,
        }
      )

      if (proximityError) {
        logger.error(
          'Proximity search error:',
          proximityError instanceof Error ? proximityError : undefined
        )
        throw proximityError
      }

      // Apply offset client-side
      data = (proximityData || []).slice(offset, offset + limit)
    }
    // Strategy 2: City filter fallback
    else if (city) {
      const { data: cityData, error: cityError } = await adminClient
        .from('communities')
        .select('*')
        .eq('location_city', city)
        .eq('is_deleted', false)
        .neq('id', '00000000-0000-0000-0000-000000000001') // Exclude archived system community
        .order('member_count', { ascending: false })
        .range(offset, offset + limit - 1)

      data = cityData || []
      error = cityError
    }
    // Strategy 3: Get all public communities
    else {
      const { data: allData, error: allError } = await adminClient
        .from('communities')
        .select('*')
        .eq('is_deleted', false)
        .neq('id', '00000000-0000-0000-0000-000000000001')
        .order('member_count', { ascending: false })
        .range(offset, offset + limit - 1)

      data = allData || []
      error = allError
    }

    if (error) throw error

    // Enrich communities with membership data and filter private ones
    interface CommunityWithId {
      id: string
      [key: string]: unknown
    }

    let enrichedData = (data || []) as CommunityWithId[]

    if (user && enrichedData.length > 0) {
      // Get all user memberships in one query
      const communityIds = enrichedData.map((c) => c.id)
      const { data: memberships, error: memberError } = await adminClient
        .from('community_members')
        .select('community_id, role')
        .eq('user_id', user.id)
        .in('community_id', communityIds)

      if (!memberError && memberships) {
        interface Membership {
          community_id: string
          role: string
        }
        // Create a map of community_id -> role for quick lookup
        const membershipMap = new Map(
          (memberships as Membership[]).map((m) => [m.community_id, m.role])
        )

        // Enrich each community with membership data
        enrichedData = enrichedData.map((community) => {
          const role = membershipMap.get(community.id)
          return {
            ...community,
            is_member: !!role,
            user_role: role || null,
          }
        })

        // Filter: Only show public communities OR private communities where user is a member
        const userCommunityIds = new Set((memberships as Membership[]).map((m) => m.community_id))
        enrichedData = enrichedData.filter((c) => {
          const community = c as CommunityWithId & { is_private?: boolean }
          return !community.is_private || userCommunityIds.has(community.id)
        })
      } else {
        // If we can't get memberships, only show public communities
        enrichedData = enrichedData.filter((c) => {
          const community = c as CommunityWithId & { is_private?: boolean }
          return !community.is_private
        })
      }
    } else {
      // Anonymous users: only show public communities
      enrichedData = enrichedData.filter((c) => {
        const community = c as CommunityWithId & { is_private?: boolean }
        return !community.is_private
      })
    }

    return NextResponse.json({
      success: true,
      data: enrichedData,
      meta: {
        count: enrichedData.length,
        limit,
        offset,
        filters: {
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          radius,
          city,
          user_id: userId,
        },
        hasProximitySearch: !!(lat && lng),
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/communities' })
  }
})
/**
 * Enrich communities with distance calculation
 * For cases where we didn't use the proximity RPC
 */
async function enrichWithDistance(
  _supabase: Awaited<ReturnType<typeof createAdminClient>>,
  communities: unknown[],
  userLat: number,
  userLng: number
): Promise<Record<string, unknown>[]> {
  // Calculate distance for each community that has coordinates
  return communities.map((community: unknown) => {
    const communityObj = community as Record<string, unknown>
    if (!communityObj.location_coordinates) {
      return communityObj
    }

    // Parse PostGIS POINT format
    const match = (communityObj.location_coordinates as string).match(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (!match) {
      return communityObj
    }

    const lng = parseFloat(match[1] ?? '0')
    const lat = parseFloat(match[2] ?? '0')

    // Haversine formula for distance
    const R = 6371 // Earth's radius in km
    const dLat = toRadians(lat - userLat)
    const dLon = toRadians(lng - userLng)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(userLat)) *
        Math.cos(toRadians(lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return {
      ...communityObj,
      distance_km: Math.round(distance * 10) / 10,
    }
  })
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}
