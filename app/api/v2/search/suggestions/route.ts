import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'
import { redisCache, CacheTags } from '@/lib/cache/redis-cache'
import { normalizeSearchQuery } from '@/lib/utils/search'

export const dynamic = 'force-dynamic'

interface SearchSuggestion {
  text: string
  type: 'artist' | 'event' | 'community' | 'post' | 'popular' | 'recent'
  count?: number
}

/**
 * GET /api/v2/search/suggestions - Get search suggestions
 *
 * Query params:
 * - q: Partial search query (optional, for autocomplete)
 * - limit: Maximum number of suggestions (default: 10)
 *
 * Returns search suggestions including:
 * - Popular searches
 * - Recent searches (user-specific)
 * - Autocomplete suggestions from database
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/v2/search/suggestions')
  try {
    const searchParams = _request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    // Check cache
    const cacheKey = `search:suggestions:${normalizeSearchQuery(query)}`
    const cached = await redisCache.get<SearchSuggestion[]>(cacheKey)

    if (cached) {
      logger.info('Cache hit for search suggestions', { query })
      return NextResponse.json({
        success: true,
        data: cached.slice(0, limit),
      })
    }

    const supabase = await createClient()
    const suggestions: SearchSuggestion[] = []

    // Get popular searches from cache (if available)
    // In a real implementation, you'd track popular searches in analytics
    const popularSearches: SearchSuggestion[] = [
      { text: 'music events', type: 'popular' },
      { text: 'photographer', type: 'popular' },
      { text: 'comedy show', type: 'popular' },
    ]

    // Get autocomplete suggestions from database if query provided
    if (query.trim().length >= 2) {
      const normalizedQuery = query.toLowerCase().trim()

      // Get suggestions from artists
      const { data: artists } = await supabase
        .from('artists')
        .select('stage_name, service_category')
        .in('subscription_status', ['active', 'trial'])
        .or(`stage_name.ilike.%${normalizedQuery}%,service_category.ilike.%${normalizedQuery}%`)
        .limit(3)

      if (artists) {
        for (const artist of artists) {
          if (artist.stage_name?.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
              text: artist.stage_name,
              type: 'artist',
            })
          }
          if (artist.service_category?.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
              text: artist.service_category,
              type: 'artist',
            })
          }
        }
      }

      // Get suggestions from events
      const { data: events } = await supabase
        .from('events')
        .select('title')
        .gte('event_date', new Date().toISOString())
        .gt('expires_at', new Date().toISOString())
        .ilike('title', `%${normalizedQuery}%`)
        .limit(3)

      if (events) {
        for (const event of events) {
          if (event.title?.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
              text: event.title,
              type: 'event',
            })
          }
        }
      }

      // Get suggestions from communities
      const { data: communities } = await supabase
        .from('communities')
        .select('name')
        .eq('is_deleted', false)
        .ilike('name', `%${normalizedQuery}%`)
        .limit(3)

      if (communities) {
        for (const community of communities) {
          if (community.name?.toLowerCase().includes(normalizedQuery)) {
            suggestions.push({
              text: community.name,
              type: 'community',
            })
          }
        }
      }
    } else {
      // If no query, return popular searches
      suggestions.push(...popularSearches)
    }

    // Deduplicate suggestions
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map((s) => [s.text.toLowerCase(), s])).values()
    ).slice(0, limit)

    // Cache suggestions for 10 minutes
    await redisCache.set(cacheKey, uniqueSuggestions, 600, [CacheTags.SEARCH])

    return NextResponse.json({
      success: true,
      data: uniqueSuggestions,
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/search/suggestions' })
  }
})
