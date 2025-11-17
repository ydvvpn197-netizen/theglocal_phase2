import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'

import { withRateLimit } from '@/lib/middleware/with-rate-limit'
export const dynamic = 'force-dynamic'

interface RecordWithCity {
  location_city: string | null
}

/**
 * Group records by city
 */
function groupByCity(records: unknown[]): Record<string, number> {
  return records.reduce((acc: Record<string, number>, record: unknown) => {
    const recordWithCity = record as RecordWithCity
    const city = recordWithCity.location_city
    if (city) {
      acc[city] = (acc[city] || 0) + 1
    }
    return acc
  }, {})
}

/**
 * Identify underserved areas
 * Cities with users but low artist/event density
 */
function identifyUnderservedAreas(
  usersPerCity: Record<string, number>,
  artistsPerCity: Record<string, number>,
  eventsPerCity: Record<string, number>
): Array<{ city: string; users: number; artists: number; events: number; score: number }> {
  const underserved: unknown[] = []

  for (const city in usersPerCity) {
    const users = usersPerCity[city]
    const artists = artistsPerCity[city] || 0
    const events = eventsPerCity[city] || 0

    // Calculate underserved score (higher = more underserved)
    // More users but fewer artists/events = underserved
    const artistRatio = users && users > 0 ? artists / users : 0
    const eventRatio = users && users > 0 ? events / users : 0

    // Underserved if:
    // - Has at least 5 users
    // - Artist ratio < 0.1 (fewer than 1 artist per 10 users)
    // - Event ratio < 0.05 (fewer than 1 event per 20 users)
    if (users && users >= 5 && (artistRatio < 0.1 || eventRatio < 0.05)) {
      const score = users - artists * 5 - events * 10

      underserved.push({
        city,
        users,
        artists,
        events,
        score,
      })
    }
  }

  return underserved
    .sort((a: unknown, b: unknown) => {
      const aObj = a as Record<string, unknown>
      const bObj = b as Record<string, unknown>
      return (bObj.score as number) - (aObj.score as number)
    })
    .slice(0, 10) as {
    city: string
    users: number
    artists: number
    events: number
    score: number
  }[]
}

/**
 * GET /api/v2/analytics/location-stats - Geographic distribution insights
 *
 * Returns statistics about content distribution across cities
 * Useful for admin dashboard to identify:
 * - Most active cities
 * - Underserved areas
 * - Growth opportunities
 * - Geographic trends
 *
 * Requires admin authentication
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated and has admin role
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is super admin (you may have a different auth check)
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get artists per city
    const { data: artistsByCity } = await supabase
      .from('artists')
      .select('location_city')
      .not('location_city', 'is', null)

    const artistsPerCity = groupByCity(artistsByCity || [])

    // Get events per city
    const { data: eventsByCity } = await supabase
      .from('events')
      .select('location_city')
      .gte('event_date', new Date().toISOString())
      .not('location_city', 'is', null)

    const eventsPerCity = groupByCity(eventsByCity || [])

    // Get communities per city
    const { data: communitiesByCity } = await supabase
      .from('communities')
      .select('location_city')
      .eq('is_deleted', false)
      .not('location_city', 'is', null)

    const communitiesPerCity = groupByCity(communitiesByCity || [])

    // Get users per city
    const { data: usersByCity } = await supabase
      .from('users')
      .select('location_city')
      .not('location_city', 'is', null)

    const usersPerCity = groupByCity(usersByCity || [])

    // Identify underserved areas (cities with users but few artists/events)
    const underservedAreas = identifyUnderservedAreas(usersPerCity, artistsPerCity, eventsPerCity)

    // Get records with missing coordinates
    const { count: artistsWithoutCoords } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true })
      .is('location_coordinates', null)

    const { count: eventsWithoutCoords } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .is('location_coordinates', null)

    const { count: communitiesWithoutCoords } = await supabase
      .from('communities')
      .select('*', { count: 'exact', head: true })
      .is('location_coordinates', null)

    // Top cities by activity
    const allCities = new Set([
      ...Object.keys(artistsPerCity),
      ...Object.keys(eventsPerCity),
      ...Object.keys(communitiesPerCity),
    ])

    const topCities = Array.from(allCities)
      .map((city) => ({
        city,
        artists: artistsPerCity[city] || 0,
        events: eventsPerCity[city] || 0,
        communities: communitiesPerCity[city] || 0,
        users: usersPerCity[city] || 0,
        total_activity:
          (artistsPerCity[city] || 0) +
          (eventsPerCity[city] || 0) * 2 + // Weight events higher
          (communitiesPerCity[city] || 0) * 3, // Weight communities highest
      }))
      .sort((a, b) => b.total_activity - a.total_activity)
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      data: {
        artists_per_city: artistsPerCity,
        events_per_city: eventsPerCity,
        communities_per_city: communitiesPerCity,
        users_per_city: usersPerCity,
        underserved_areas: underservedAreas,
        top_cities: topCities,
        data_quality: {
          artists_without_coordinates: artistsWithoutCoords || 0,
          events_without_coordinates: eventsWithoutCoords || 0,
          communities_without_coordinates: communitiesWithoutCoords || 0,
        },
        total_cities: allCities.size,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/analytics/location-stats' })
  }
})
