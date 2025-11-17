import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'
import {
  parseSearchQuery,
  calculateRelevanceScore,
  generateSearchCacheKey,
} from '@/lib/utils/search'
import { redisCache, CacheTags } from '@/lib/cache/redis-cache'
import { ARTIST_CATEGORIES } from '@/lib/utils/constants'

export const dynamic = 'force-dynamic'

interface SearchFilters {
  type?: string
  lat?: string
  lng?: string
  radius?: number
  city?: string
  category?: string
  dateFrom?: string
  dateTo?: string
}

interface SearchResult {
  [key: string]: unknown
  type: 'artist' | 'event' | 'community' | 'post'
  relevanceScore?: number
  distance_km?: number
}

/**
 * GET /api/v2/search - Enhanced unified search across all content types
 *
 * Query params:
 * - q: Search query (required)
 * - type: Filter by type (all, artists, events, communities, posts)
 * - lat, lng, radius: Proximity search
 * - city: City filter
 * - category: Category filter (for artists/events)
 * - date_from, date_to: Date range filter (for events/posts)
 * - limit, offset: Pagination
 *
 * Returns unified results with relevance scoring and distance
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/v2/search')
  try {
    const searchParams = _request.nextUrl.searchParams

    const query = searchParams.get('q') || ''
    const filters: SearchFilters = {
      type: searchParams.get('type') || 'all',
      lat: searchParams.get('lat') || undefined,
      lng: searchParams.get('lng') || undefined,
      radius: parseFloat(searchParams.get('radius') || '25'),
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
    }
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Check cache
    const cacheKey = generateSearchCacheKey(query, filters as Record<string, unknown>)
    const cached = await redisCache.get<{
      data: SearchResult[]
      meta: unknown
    }>(cacheKey)

    if (cached) {
      logger.info('Cache hit for search', { query, filters })
      return NextResponse.json({
        success: true,
        data: cached.data.slice(offset, offset + limit),
        meta: {
          ...(cached.meta as Record<string, unknown>),
          cached: true,
        },
      })
    }

    const supabase = await createClient()
    const searchTerms = parseSearchQuery(query)
    const results: SearchResult[] = []
    const useProximitySearch = filters.lat && filters.lng

    // Build search conditions for Supabase query builder
    // For now, use ILIKE for partial matching (fuzzy matching can be added via database function)
    const buildSearchConditions = (fields: string[], terms: string[]) => {
      // Build OR conditions for each field with each term
      const conditions: string[] = []
      for (const field of fields) {
        for (const term of terms) {
          conditions.push(`${field}.ilike.%${term}%`)
        }
      }
      return conditions.join(',')
    }

    // Search Artists
    if (filters.type === 'all' || filters.type === 'artists') {
      let artistQuery = supabase
        .from('artists')
        .select('*')
        .in('subscription_status', ['active', 'trial'])

      // Apply search query
      if (searchTerms.length > 0) {
        // Use full-text search with pg_trgm for fuzzy matching
        const searchCondition = buildSearchConditions(
          ['stage_name', 'description', 'service_category'],
          searchTerms
        )
        artistQuery = artistQuery.or(searchCondition)
      }

      // Apply filters
      if (filters.city) {
        artistQuery = artistQuery.eq('location_city', filters.city)
      }

      if (
        filters.category &&
        ARTIST_CATEGORIES.includes(filters.category as (typeof ARTIST_CATEGORIES)[number])
      ) {
        artistQuery = artistQuery.eq('service_category', filters.category)
      }

      // Apply proximity search if available
      if (useProximitySearch) {
        const { data: proximityData } = await supabase.rpc('get_artists_within_radius', {
          user_lat: parseFloat(filters.lat!),
          user_lng: parseFloat(filters.lng!),
          radius_km: filters.radius,
          category_filter: filters.category || null,
          limit_count: 50,
        })

        if (proximityData) {
          // Filter by search terms
          const filtered = proximityData.filter((artist: Record<string, unknown>) => {
            const stageName = String(artist.stage_name || '')
            const description = String(artist.description || '')
            const category = String(artist.service_category || '')

            return searchTerms.some((term) => {
              const lowerTerm = term.toLowerCase()
              return (
                stageName.toLowerCase().includes(lowerTerm) ||
                description.toLowerCase().includes(lowerTerm) ||
                category.toLowerCase().includes(lowerTerm)
              )
            })
          })

          // Calculate relevance scores
          const scored = filtered.map((artist: Record<string, unknown>) => {
            const score = calculateRelevanceScore({
              text: `${String(artist.stage_name || '')} ${String(artist.description || '')}`,
              searchTerms,
              isTitle: true,
              distanceKm: artist.distance_km as number | undefined,
            })

            return {
              ...artist,
              type: 'artist' as const,
              relevanceScore: score,
            }
          })

          results.push(...scored)
        }
      } else {
        const { data: artistData } = await artistQuery.limit(50)

        if (artistData) {
          // Calculate relevance scores
          const scored = artistData.map((artist) => {
            const score = calculateRelevanceScore({
              text: `${artist.stage_name || ''} ${artist.description || ''}`,
              searchTerms,
              isTitle: true,
              createdAt: artist.created_at,
            })

            return {
              ...artist,
              type: 'artist' as const,
              relevanceScore: score,
            }
          })

          results.push(...scored)
        }
      }
    }

    // Search Events
    if (filters.type === 'all' || filters.type === 'events') {
      let eventQuery = supabase
        .from('events')
        .select('*')
        .gte('event_date', filters.dateFrom || new Date().toISOString())
        .gt('expires_at', new Date().toISOString())

      // Apply date range filter
      if (filters.dateTo) {
        eventQuery = eventQuery.lte('event_date', filters.dateTo)
      }

      // Apply search query
      if (searchTerms.length > 0) {
        const searchCondition = buildSearchConditions(['title', 'description'], searchTerms)
        eventQuery = eventQuery.or(searchCondition)
      }

      // Apply filters
      if (filters.city) {
        eventQuery = eventQuery.ilike('location_city', `%${filters.city}%`)
      }

      if (filters.category) {
        eventQuery = eventQuery.eq('category', filters.category)
      }

      // Apply proximity search if available
      if (useProximitySearch) {
        const { data: proximityData } = await supabase.rpc('get_events_within_radius', {
          user_lat: parseFloat(filters.lat!),
          user_lng: parseFloat(filters.lng!),
          radius_km: filters.radius,
          category_filter: filters.category || null,
          source_filter: null,
          limit_count: 50,
        })

        if (proximityData) {
          // Filter by search terms and date range
          const filtered = proximityData.filter((event: Record<string, unknown>) => {
            const title = String(event.title || '')
            const description = String(event.description || '')
            const eventDate = new Date(String(event.event_date || ''))

            // Check date range
            if (filters.dateFrom && eventDate < new Date(filters.dateFrom)) return false
            if (filters.dateTo && eventDate > new Date(filters.dateTo)) return false

            // Check search terms
            return searchTerms.some((term) => {
              const lowerTerm = term.toLowerCase()
              return (
                title.toLowerCase().includes(lowerTerm) ||
                description.toLowerCase().includes(lowerTerm)
              )
            })
          })

          // Calculate relevance scores
          const scored = filtered.map((event: Record<string, unknown>) => {
            const score = calculateRelevanceScore({
              text: `${String(event.title || '')} ${String(event.description || '')}`,
              searchTerms,
              isTitle: true,
              distanceKm: event.distance_km as number | undefined,
              createdAt: String(event.event_date || ''),
            })

            return {
              ...event,
              type: 'event' as const,
              relevanceScore: score,
            }
          })

          results.push(...scored)
        }
      } else {
        const { data: eventData } = await eventQuery.limit(50)

        if (eventData) {
          // Calculate relevance scores
          const scored = eventData.map((event) => {
            const score = calculateRelevanceScore({
              text: `${event.title || ''} ${event.description || ''}`,
              searchTerms,
              isTitle: true,
              createdAt: event.event_date,
            })

            return {
              ...event,
              type: 'event' as const,
              relevanceScore: score,
            }
          })

          results.push(...scored)
        }
      }
    }

    // Search Communities
    if (filters.type === 'all' || filters.type === 'communities') {
      let communityQuery = supabase.from('communities').select('*').eq('is_deleted', false)

      // Apply search query
      if (searchTerms.length > 0) {
        const searchCondition = buildSearchConditions(['name', 'description'], searchTerms)
        communityQuery = communityQuery.or(searchCondition)
      }

      // Apply filters
      if (filters.city) {
        communityQuery = communityQuery.eq('location_city', filters.city)
      }

      // Apply proximity search if available
      if (useProximitySearch) {
        const { data: proximityData } = await supabase.rpc('get_communities_within_radius', {
          user_lat: parseFloat(filters.lat!),
          user_lng: parseFloat(filters.lng!),
          radius_km: filters.radius,
          limit_count: 50,
        })

        if (proximityData) {
          // Filter by search terms
          const filtered = proximityData.filter((community: Record<string, unknown>) => {
            const name = String(community.name || '')
            const description = String(community.description || '')

            return searchTerms.some((term) => {
              const lowerTerm = term.toLowerCase()
              return (
                name.toLowerCase().includes(lowerTerm) ||
                description.toLowerCase().includes(lowerTerm)
              )
            })
          })

          // Calculate relevance scores
          const scored = filtered.map((community: Record<string, unknown>) => {
            const score = calculateRelevanceScore({
              text: `${String(community.name || '')} ${String(community.description || '')}`,
              searchTerms,
              isTitle: true,
              distanceKm: community.distance_km as number | undefined,
              createdAt: String(community.created_at || ''),
            })

            return {
              ...community,
              type: 'community' as const,
              relevanceScore: score,
            }
          })

          results.push(...scored)
        }
      } else {
        const { data: communityData } = await communityQuery.limit(50)

        if (communityData) {
          // Calculate relevance scores
          const scored = communityData.map((community) => {
            const score = calculateRelevanceScore({
              text: `${community.name || ''} ${community.description || ''}`,
              searchTerms,
              isTitle: true,
              createdAt: community.created_at,
            })

            return {
              ...community,
              type: 'community' as const,
              relevanceScore: score,
            }
          })

          results.push(...scored)
        }
      }
    }

    // Search Posts
    if (filters.type === 'all' || filters.type === 'posts') {
      let postQuery = supabase
        .from('posts')
        .select(
          `
          *,
          author:users!author_id(anonymous_handle, avatar_seed),
          community:communities(name, slug)
        `
        )
        .eq('is_deleted', false)

      // Apply search query
      if (searchTerms.length > 0) {
        const searchCondition = buildSearchConditions(['title', 'body'], searchTerms)
        postQuery = postQuery.or(searchCondition)
      }

      // Apply filters
      if (filters.city) {
        postQuery = postQuery.eq('location_city', filters.city)
      }

      // Apply date range filter
      if (filters.dateFrom) {
        postQuery = postQuery.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        postQuery = postQuery.lte('created_at', filters.dateTo)
      }

      const { data: postData } = await postQuery.limit(50)

      if (postData) {
        // Calculate relevance scores
        const scored = postData.map((post) => {
          const score = calculateRelevanceScore({
            text: `${post.title || ''} ${post.body || ''}`,
            searchTerms,
            isTitle: true,
            createdAt: post.created_at,
          })

          return {
            ...post,
            type: 'post' as const,
            relevanceScore: score,
          }
        })

        results.push(...scored)
      }
    }

    // Sort by relevance score (descending), then by distance (ascending)
    results.sort((a, b) => {
      const scoreA = a.relevanceScore || 0
      const scoreB = b.relevanceScore || 0

      if (scoreA !== scoreB) {
        return scoreB - scoreA
      }

      // Secondary sort by distance
      const distA = (a.distance_km as number | undefined) ?? Infinity
      const distB = (b.distance_km as number | undefined) ?? Infinity

      return distA - distB
    })

    // Cache results (5 minutes for regular searches, 1 hour for popular searches)
    const isPopularSearch = query.length <= 3 // Short queries are likely popular
    const cacheTTL = isPopularSearch ? 3600 : 300

    await redisCache.set(
      cacheKey,
      {
        data: results,
        meta: {
          query,
          total: results.length,
          filters,
          hasProximitySearch: useProximitySearch,
        },
      },
      cacheTTL,
      [CacheTags.SEARCH]
    )

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginatedResults,
      meta: {
        query,
        count: paginatedResults.length,
        total: results.length,
        limit,
        offset,
        filters,
        hasProximitySearch: useProximitySearch,
        breakdown: {
          artists: results.filter((r) => r.type === 'artist').length,
          events: results.filter((r) => r.type === 'event').length,
          communities: results.filter((r) => r.type === 'community').length,
          posts: results.filter((r) => r.type === 'post').length,
        },
        cached: false,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/search' })
  }
})
