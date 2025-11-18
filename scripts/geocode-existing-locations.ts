/**
 * Geocoding Script - Populate NULL coordinates for existing records
 *
 * This script uses Google Geocoding API to convert city names to coordinates
 * for all records that have a city but NULL coordinates.
 *
 * Usage: npx tsx scripts/geocode-existing-locations.ts
 *
 * Environment: Requires GOOGLE_GEOCODING_API_KEY in .env.local
 *
 * UPDATED: Now uses shared geocoding utility from lib/utils/geocoding.ts
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  geocodeCity,
  updateRecordCoordinates,
  queueGeocoding,
  getGeocodingStats,
} from '../lib/utils/geocoding'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const BATCH_SIZE = 100
const DELAY_MS = 1000 // 1 second delay between batches to respect rate limits

interface GeocodeStats {
  table: string
  total: number
  withCoordinates: number
  needsGeocoding: number
  successful: number
  failed: number
  errors: string[]
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Geocode records for a specific table
 */
async function geocodeTable(
  supabase: SupabaseClient,
  tableName: string,
  idColumn: string = 'id',
  cityColumn: string = 'location_city',
  coordsColumn: string = 'location_coordinates'
): Promise<GeocodeStats> {
  const stats: GeocodeStats = {
    table: tableName,
    total: 0,
    withCoordinates: 0,
    needsGeocoding: 0,
    successful: 0,
    failed: 0,
    errors: [],
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Processing table: ${tableName}`)
  console.log('='.repeat(60))

  // Get total count
  const { count: totalCount } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  stats.total = totalCount || 0
  console.log(`Total records: ${stats.total}`)

  // Get count with coordinates
  const { count: withCoordsCount } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .not(coordsColumn, 'is', null)

  stats.withCoordinates = withCoordsCount || 0
  console.log(`Already have coordinates: ${stats.withCoordinates}`)

  // Get records that need geocoding
  const { data: recordsToGeocode, error } = await supabase
    .from(tableName)
    .select(`${idColumn}, ${cityColumn}`)
    .is(coordsColumn, null)
    .not(cityColumn, 'is', null)

  if (error) {
    console.error(`Error fetching records from ${tableName}:`, error)
    stats.errors.push(`Fetch error: ${error.message}`)
    return stats
  }

  stats.needsGeocoding = recordsToGeocode?.length || 0
  console.log(`Need geocoding: ${stats.needsGeocoding}`)

  if (stats.needsGeocoding === 0) {
    console.log('✓ No records need geocoding')
    return stats
  }

  // Process in batches
  const batches = Math.ceil(stats.needsGeocoding / BATCH_SIZE)
  console.log(`Processing in ${batches} batches of ${BATCH_SIZE}`)

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE
    const end = Math.min(start + BATCH_SIZE, stats.needsGeocoding)
    const batch = recordsToGeocode.slice(start, end)

    console.log(`\nBatch ${i + 1}/${batches} (${start + 1}-${end}/${stats.needsGeocoding})`)

    for (const record of batch) {
      const recordObj = record as unknown as Record<string, unknown>
      const city = recordObj[cityColumn] as string | undefined
      const recordId = recordObj[idColumn] as string | undefined

      if (!city || !recordId || typeof city !== 'string' || typeof recordId !== 'string') {
        stats.failed++
        stats.errors.push(`Invalid record data in ${tableName}`)
        continue
      }

      try {
        // Geocode the city using shared utility
        const geocoded = await geocodeCity(city)

        if (geocoded) {
          // Update the record with coordinates using shared utility
          const updateResult = await updateRecordCoordinates(
            supabase,
            tableName,
            recordId,
            geocoded
          )

          if (updateResult.error) {
            console.error(`✗ Failed to update ${recordId} (${city}):`, updateResult.error)
            stats.failed++
            stats.errors.push(`${tableName}.${recordId}: ${updateResult.error}`)
          } else {
            console.log(`✓ ${city} → (${geocoded.latitude}, ${geocoded.longitude})`)
            stats.successful++
          }
        } else {
          console.warn(`✗ Could not geocode: ${city}`)
          stats.failed++
          stats.errors.push(`${tableName}.${recordId}: Failed to geocode "${city}"`)

          // Queue for retry using shared utility
          await queueGeocoding(supabase, tableName, recordId, city)
        }

        // Small delay to respect rate limits
        await sleep(100)
      } catch (error) {
        console.error(`✗ Error processing ${recordId} (${city}):`, error)
        stats.failed++
        stats.errors.push(
          `${tableName}.${recordId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )

        // Queue for retry
        await queueGeocoding(supabase, tableName, recordId, city)
      }
    }

    // Delay between batches
    if (i < batches - 1) {
      console.log(`Waiting ${DELAY_MS}ms before next batch...`)
      await sleep(DELAY_MS)
    }
  }

  console.log(`\n${tableName} Summary:`)
  console.log(`  ✓ Successful: ${stats.successful}`)
  console.log(`  ✗ Failed: ${stats.failed}`)

  return stats
}

/**
 * Main execution
 */
async function main() {
  console.log('🌍 Geocoding Script Started')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERROR: Supabase credentials not found')
    console.error('Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const allStats: GeocodeStats[] = []

  // Geocode each table
  try {
    // 1. Users
    const usersStats = await geocodeTable(
      supabase,
      'users',
      'id',
      'location_city',
      'location_coordinates'
    )
    allStats.push(usersStats)

    // 2. Communities
    const communitiesStats = await geocodeTable(
      supabase,
      'communities',
      'id',
      'location_city',
      'location_coordinates'
    )
    allStats.push(communitiesStats)

    // 3. Posts
    const postsStats = await geocodeTable(
      supabase,
      'posts',
      'id',
      'location_city',
      'location_coordinates'
    )
    allStats.push(postsStats)

    // 4. Artists
    const artistsStats = await geocodeTable(
      supabase,
      'artists',
      'id',
      'location_city',
      'location_coordinates'
    )
    allStats.push(artistsStats)

    // 5. Events
    const eventsStats = await geocodeTable(
      supabase,
      'events',
      'id',
      'location_city',
      'location_coordinates'
    )
    allStats.push(eventsStats)

    // 6. Polls
    const pollsStats = await geocodeTable(
      supabase,
      'polls',
      'id',
      'location_city',
      'location_coordinates'
    )
    allStats.push(pollsStats)
  } catch (error) {
    console.error('❌ Fatal error during geocoding:', error)
    process.exit(1)
  }

  // Print final summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(60))

  const totalStats = allStats.reduce(
    (acc, stat) => ({
      total: acc.total + stat.total,
      withCoordinates: acc.withCoordinates + stat.withCoordinates,
      needsGeocoding: acc.needsGeocoding + stat.needsGeocoding,
      successful: acc.successful + stat.successful,
      failed: acc.failed + stat.failed,
    }),
    { total: 0, withCoordinates: 0, needsGeocoding: 0, successful: 0, failed: 0 }
  )

  console.log('\nBy Table:')
  allStats.forEach((stat) => {
    console.log(`\n${stat.table}:`)
    console.log(`  Total records: ${stat.total}`)
    console.log(`  Already had coordinates: ${stat.withCoordinates}`)
    console.log(`  Needed geocoding: ${stat.needsGeocoding}`)
    console.log(`  ✓ Successfully geocoded: ${stat.successful}`)
    console.log(`  ✗ Failed: ${stat.failed}`)
  })

  console.log('\nOverall Totals:')
  console.log(`  Total records across all tables: ${totalStats.total}`)
  console.log(`  Already had coordinates: ${totalStats.withCoordinates}`)
  console.log(`  Needed geocoding: ${totalStats.needsGeocoding}`)
  console.log(`  ✓ Successfully geocoded: ${totalStats.successful}`)
  console.log(`  ✗ Failed: ${totalStats.failed}`)

  const successRate =
    totalStats.needsGeocoding > 0
      ? ((totalStats.successful / totalStats.needsGeocoding) * 100).toFixed(1)
      : '0'
  console.log(`  Success rate: ${successRate}%`)

  // Print errors if any
  const allErrors = allStats.flatMap((s) => s.errors)
  if (allErrors.length > 0) {
    console.log('\n❌ Errors encountered:')
    allErrors.slice(0, 20).forEach((error) => console.log(`  - ${error}`))
    if (allErrors.length > 20) {
      console.log(`  ... and ${allErrors.length - 20} more errors`)
    }
  }

  // Show queue statistics if available
  try {
    const queueStats = await getGeocodingStats(supabase)
    console.log('\n📋 Geocoding Queue Status:')
    console.log(`  Pending: ${queueStats.pending}`)
    console.log(`  Processing: ${queueStats.processing}`)
    console.log(`  Completed: ${queueStats.completed}`)
    console.log(`  Failed: ${queueStats.failed}`)
  } catch (error) {
    // Queue might not exist yet, silently continue
  }

  console.log('\n✅ Geocoding script completed!')
  console.log('💡 Failed records have been queued for retry with exponential backoff')
}

// Run the script
main().catch((error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})
