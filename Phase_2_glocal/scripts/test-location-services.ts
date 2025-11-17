/**
 * Location Services Diagnostic Script
 *
 * Tests all proximity search functions and reports on location data availability
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test coordinates (Mumbai, India)
const TEST_LAT = 19.076
const TEST_LNG = 72.8777

interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  data?: unknown
  duration?: number
}

const results: DiagnosticResult[] = []

/**
 * Run a diagnostic test and record results
 */
async function runTest(testName: string, testFn: () => Promise<unknown>): Promise<void> {
  const start = Date.now()
  try {
    const data = await testFn()
    const duration = Date.now() - start
    results.push({
      test: testName,
      status: 'pass',
      message: 'Test passed successfully',
      data,
      duration,
    })
  } catch (error: unknown) {
    const duration = Date.now() - start
    results.push({
      test: testName,
      status: 'fail',
      message: error instanceof Error ? error.message : 'Test failed',
      duration,
    })
  }
}

async function main() {
  console.log('🔍 Location Services Diagnostic Tool\n')
  console.log(`Testing with coordinates: ${TEST_LAT}, ${TEST_LNG} (Mumbai, India)\n`)

  // Test 1: Check PostGIS Extension
  await runTest('Check PostGIS Extension', async () => {
    const { data: _data, error: _error } = await supabase.rpc('pg_stat_activity', {})

    // Try a PostGIS function to verify it's available
    const { data: _stData, error: stError } = await supabase.rpc('st_distance', {
      point1: `POINT(${TEST_LNG} ${TEST_LAT})`,
      point2: `POINT(${TEST_LNG} ${TEST_LAT})`,
    })

    return {
      extensionExists: !stError,
      error: stError?.message || null,
    }
  })

  // Test 2: Count location data
  await runTest('Count Location Data', async () => {
    const [artists, events, communities, posts] = await Promise.all([
      supabase
        .from('artists')
        .select('id, location_coordinates, location_city', { count: 'exact', head: false }),
      supabase
        .from('events')
        .select('id, location_coordinates, location_city', { count: 'exact', head: false }),
      supabase
        .from('communities')
        .select('id, location_coordinates, location_city', { count: 'exact', head: false }),
      supabase
        .from('posts')
        .select('id, location_coordinates, location_city', { count: 'exact', head: false }),
    ])

    return {
      artists: {
        total: artists.count || 0,
        withCoords: artists.data?.filter((a) => a.location_coordinates).length || 0,
        withCity: artists.data?.filter((a) => a.location_city).length || 0,
      },
      events: {
        total: events.count || 0,
        withCoords: events.data?.filter((e) => e.location_coordinates).length || 0,
        withCity: events.data?.filter((e) => e.location_city).length || 0,
      },
      communities: {
        total: communities.count || 0,
        withCoords: communities.data?.filter((c) => c.location_coordinates).length || 0,
        withCity: communities.data?.filter((c) => c.location_city).length || 0,
      },
      posts: {
        total: posts.count || 0,
        withCoords: posts.data?.filter((p) => p.location_coordinates).length || 0,
        withCity: posts.data?.filter((p) => p.location_city).length || 0,
      },
    }
  })

  // Test 3: Test get_artists_within_radius function
  await runTest('Test get_artists_within_radius', async () => {
    const { data, error } = await supabase.rpc('get_artists_within_radius', {
      user_lat: TEST_LAT,
      user_lng: TEST_LNG,
      radius_km: 50,
      limit_count: 10,
    })

    if (error) {
      throw new Error(`Function error: ${error.message}`)
    }

    return {
      results: data?.length || 0,
      sampleData: Array.isArray(data)
        ? data.slice(0, 3).map((a: Record<string, unknown>) => {
            const artist = a as {
              id?: string
              stage_name?: string
              distance_km?: number
              location_city?: string
            }
            return {
              id: artist.id,
              name: artist.stage_name,
              distance: artist.distance_km,
              city: artist.location_city,
            }
          })
        : [],
    }
  })

  // Test 4: Test get_communities_within_radius function
  await runTest('Test get_communities_within_radius', async () => {
    const { data, error } = await supabase.rpc('get_communities_within_radius', {
      user_lat: TEST_LAT,
      user_lng: TEST_LNG,
      radius_km: 50,
      limit_count: 10,
    })

    if (error) {
      throw new Error(`Function error: ${error.message}`)
    }

    return {
      results: data?.length || 0,
      sampleData: Array.isArray(data)
        ? data.slice(0, 3).map((c: Record<string, unknown>) => {
            const community = c as {
              id?: string
              name?: string
              distance_km?: number
              location_city?: string
            }
            return {
              id: community.id,
              name: community.name,
              distance: community.distance_km,
              city: community.location_city,
            }
          })
        : [],
    }
  })

  // Test 5: Test get_posts_within_radius function
  await runTest('Test get_posts_within_radius', async () => {
    const { data, error } = await supabase.rpc('get_posts_within_radius', {
      user_lat: TEST_LAT,
      user_lng: TEST_LNG,
      radius_km: 50,
      limit_count: 10,
    })

    if (error) {
      throw new Error(`Function error: ${error.message}`)
    }

    return {
      results: data?.length || 0,
      sampleData: Array.isArray(data)
        ? data.slice(0, 3).map((p: Record<string, unknown>) => {
            const post = p as {
              id?: string
              title?: string
              distance_km?: number
              location_city?: string
            }
            return {
              id: post.id,
              title: typeof post.title === 'string' ? post.title.substring(0, 50) : undefined,
              distance: post.distance_km,
              city: post.location_city,
            }
          })
        : [],
    }
  })

  // Test 6: Test get_events_within_radius function
  await runTest('Test get_events_within_radius', async () => {
    const { data, error } = await supabase.rpc('get_events_within_radius', {
      user_lat: TEST_LAT,
      user_lng: TEST_LNG,
      radius_km: 50,
      limit_count: 10,
    })

    if (error) {
      throw new Error(`Function error: ${error.message}`)
    }

    return {
      results: data?.length || 0,
      sampleData: Array.isArray(data)
        ? data.slice(0, 3).map((e: Record<string, unknown>) => {
            const event = e as {
              id?: string
              title?: string
              distance_km?: number
              location_city?: string
            }
            return {
              id: event.id,
              title: typeof event.title === 'string' ? event.title.substring(0, 50) : undefined,
              distance: event.distance_km,
              city: event.location_city,
            }
          })
        : [],
    }
  })

  // Test 7: Check spatial indexes
  await runTest('Check Spatial Indexes', async () => {
    const { data: _data, error: _error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND (tablename IN ('artists', 'events', 'communities', 'posts'))
            AND indexdef LIKE '%GIST%'
            AND indexdef LIKE '%location_coordinates%'
        ORDER BY tablename, indexname;
      `,
    })

    return {
      indexes: _data || [],
      count: _data?.length || 0,
    }
  })

  // Generate Report
  console.log('\n' + '='.repeat(80))
  console.log('📊 DIAGNOSTIC REPORT')
  console.log('='.repeat(80) + '\n')

  let passCount = 0
  let failCount = 0
  let warnCount = 0

  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
    console.log(`${icon} Test ${index + 1}: ${result.test}`)
    console.log(`   Status: ${result.status.toUpperCase()}`)
    console.log(`   Message: ${result.message}`)
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`)
    }
    if (result.data) {
      console.log(
        `   Data:`,
        JSON.stringify(result.data, null, 2)
          .split('\n')
          .map((line) => '   ' + line)
          .join('\n')
      )
    }
    console.log()

    if (result.status === 'pass') passCount++
    else if (result.status === 'fail') failCount++
    else warnCount++
  })

  console.log('='.repeat(80))
  console.log(`📈 SUMMARY: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`)
  console.log('='.repeat(80) + '\n')

  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n')

  if (failCount === 0 && warnCount === 0) {
    console.log('✅ All tests passed! Location services are fully operational.')
  } else {
    const hasData = results.find((r) => r.test === 'Count Location Data')
    interface LocationData {
      artists?: { withCoords?: number }
      events?: { withCoords?: number }
      communities?: { withCoords?: number }
      posts?: { withCoords?: number }
    }
    const locationData = hasData?.data as LocationData | undefined
    const hasNoData =
      locationData &&
      locationData.artists?.withCoords === 0 &&
      locationData.events?.withCoords === 0 &&
      locationData.communities?.withCoords === 0 &&
      locationData.posts?.withCoords === 0

    if (hasNoData) {
      console.log('⚠️  No location data found in database:')
      console.log('   1. You need to populate location_coordinates for your records')
      console.log('   2. Consider running geocoding scripts to add coordinates')
      console.log('   3. Check the location_permissions and location context setup\n')
    }

    const eventsTest = results.find((r) => r.test === 'Test get_events_within_radius')
    if (eventsTest?.status === 'fail') {
      console.log('❌ Events proximity search is failing:')
      console.log(
        '   1. The get_events_within_radius function references non-existent "price" column'
      )
      console.log('   2. Need to update migration 0061.sql to remove or replace "price" reference')
      console.log('   3. Apply the fix to the database\n')
    }
  }

  process.exit(failCount > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
