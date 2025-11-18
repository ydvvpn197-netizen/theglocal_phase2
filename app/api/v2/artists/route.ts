import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeCategoryForFiltering } from '@/lib/utils/category-mapping'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/artists - List artists with proximity search support
 *
 * Query params:
 * - lat, lng, radius: Proximity search (returns distance_km)
 * - city: Fallback city filter if no coordinates provided
 * - category: Filter by service category
 * - search: Search in stage_name, description
 * - limit, offset: Pagination
 *
 * Response includes distance_km when lat/lng provided
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/v2/artists')
  try {
    const searchParams = _request.nextUrl.searchParams

    // Location parameters
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseFloat(searchParams.get('radius') || '25')
    const city = searchParams.get('city')

    // Filter parameters
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    let data: unknown[] = []
    let error: unknown = null

    // Normalize category for filtering (handles subcategories)
    const normalizedCategory =
      category && category !== 'all' ? normalizeCategoryForFiltering(category) : null

    // Strategy 1: Proximity search if coordinates provided
    if (lat && lng) {
      const { data: proximityData, error: proximityError } = await supabase.rpc(
        'get_artists_within_radius',
        {
          user_lat: parseFloat(lat),
          user_lng: parseFloat(lng),
          radius_km: radius,
          category_filter: normalizedCategory || null, // Pass normalized category to RPC
          limit_count: limit + offset, // Get enough for offset
        }
      )

      if (proximityError) {
        logger.error(
          'Proximity search error:',
          proximityError instanceof Error ? proximityError : undefined
        )
        throw proximityError
      }

      // Apply offset client-side (RPC doesn't support it directly)
      data = (proximityData || []).slice(offset, offset + limit)
    }
    // Strategy 2: City filter fallback
    else if (city) {
      const query = supabase
        .from('artists')
        .select('*')
        .eq('location_city', city)
        .in('subscription_status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Note: Category filtering with subcategories is handled after fetching
      // because Supabase's .or() doesn't easily support pattern matching on the same field

      const result = await query
      data = result.data || []
      error = result.error
    }
    // Strategy 3: Get all artists (no location filter)
    else {
      const query = supabase
        .from('artists')
        .select('*')
        .in('subscription_status', ['active', 'trial'])
        .order('rating_avg', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Note: Category filtering with subcategories is handled after fetching

      const result = await query
      data = result.data || []
      error = result.error
    }

    if (error) throw error

    // Apply category filtering after fetching to handle subcategories
    // This ensures we match both exact categories and categories with subcategories
    if (normalizedCategory && data.length > 0) {
      data = data.filter((artist: unknown) => {
        if (!artist || typeof artist !== 'object') return false
        const artistRecord = artist as Record<string, unknown>
        const serviceCategory = artistRecord.service_category
        if (!serviceCategory) return false
        const dbCategory = String(serviceCategory).toLowerCase()
        const filterCategory = normalizedCategory.toLowerCase()

        // Match exact category or category with subcategory (e.g., "musician" or "musician:instrumentalist")
        return dbCategory === filterCategory || dbCategory.startsWith(filterCategory + ':')
      })
    }

    // Apply search filter if provided (client-side for proximity results)
    if (search && data.length > 0) {
      const searchLower = search.toLowerCase()
      data = data.filter((artist: unknown) => {
        if (!artist || typeof artist !== 'object') return false
        const artistRecord = artist as Record<string, unknown>
        return (
          String(artistRecord.stage_name ?? '')
            .toLowerCase()
            .includes(searchLower) ||
          String(artistRecord.description ?? '')
            .toLowerCase()
            .includes(searchLower) ||
          String(artistRecord.service_category ?? '')
            .toLowerCase()
            .includes(searchLower)
        )
      })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: {
        count: data.length,
        limit,
        offset,
        filters: {
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          radius,
          city,
          category,
          search,
        },
        hasProximitySearch: !!(lat && lng),
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/artists' })
  }
})
