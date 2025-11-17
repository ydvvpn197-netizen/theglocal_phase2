/**
 * Cleanup Duplicate Events Script
 *
 * Identifies and removes duplicate events from the database
 * Keeps the newest entry (latest created_at) for each duplicate group
 *
 * Usage: npx tsx scripts/cleanup-duplicate-events?.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv?.config({ path: path?.join(process?.cwd(), '.env?.local') })

const supabaseUrl = process?.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process?.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console?.error('❌ Missing required environment variables')
  console?.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process?.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface DuplicateGroup {
  title: string
  event_date: string
  location_city: string
  source_platform: string
  count: number
  ids: string[]
  created_ats: string[]
}

/**
 * Find duplicate events
 */
async function findDuplicates(): Promise<DuplicateGroup[]> {
  console?.log('🔍 Searching for duplicate events...\n')

  // Get all events
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, event_date, location_city, source_platform, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch events: ${error?.message}`)
  }

  if (!events || events?.length === 0) {
    console?.log('No events found in database')
    return []
  }

  console?.log(`📊 Total events in database: ${events?.length}`)

  // Group events by title, date, city, and platform
  const groups = new Map<string, DuplicateGroup>()

  for (const event of events) {
    // Normalize for grouping
    const normalizedTitle = event?.title.toLowerCase().trim()
    const dateOnly = event?.event_date.split('T')[0] // Get YYYY-MM-DD
    const normalizedCity = (event?.location_city || '').toLowerCase().trim()
    const platform = event?.source_platform || 'unknown'

    const key = `${platform}::${normalizedTitle}::${dateOnly}::${normalizedCity}`

    if (!groups?.has(key)) {
      groups?.set(key, {
        title: event?.title,
        event_date: event?.event_date,
        location_city: event?.location_city,
        source_platform: event?.source_platform,
        count: 0,
        ids: [],
        created_ats: [],
      })
    }

    const group = groups?.get(key)!
    if (group) {
      group.count++
      group.ids.push(event?.id)
      group.created_ats.push(event?.created_at)
    }
  }

  // Filter to only duplicates (count > 1)
  const duplicates = Array?.from(groups?.values()).filter((group) => group?.count > 1)

  console?.log(`\n🔍 Found ${duplicates?.length} duplicate groups`)
  console?.log(`📝 Total duplicate entries: ${duplicates?.reduce((sum, g) => sum + g?.count, 0)}`)

  return duplicates
}

/**
 * Remove duplicates, keeping only the newest entry
 */
export async function removeDuplicates(duplicates: DuplicateGroup[], dryRun: boolean = true) {
  if (duplicates?.length === 0) {
    console?.log('\n✅ No duplicates to remove')
    return { removed: 0, kept: 0 }
  }

  let totalRemoved = 0
  let totalKept = 0
  const removedIds: string[] = []

  console?.log(`\n${dryRun ? '🔍 DRY RUN - No changes will be made' : '🗑️  REMOVING DUPLICATES'}`)
  console?.log('─'.repeat(80))

  for (const group of duplicates) {
    // Sort by created_at to find newest
    const sorted = group?.ids
      .map((id, index) => ({
        id,
        created_at: new Date(group?.created_ats[index] || ''),
      }))
      .sort((a, b) => b?.created_at.getTime() - a?.created_at.getTime())

    // Keep the newest (first after sorting), remove the rest
    const toKeep = sorted[0]
    const toRemove = sorted?.slice(1)

    totalKept++
    totalRemoved += toRemove?.length

    console?.log(`\n📌 "${group?.title}" (${group?.location_city})`)
    console?.log(
      `   Platform: ${group?.source_platform} | Date: ${group?.event_date.split('T')[0]}`
    )
    console?.log(`   Total duplicates: ${group?.count}`)
    console?.log(`   ✅ Keeping: ${toKeep?.id} (created: ${toKeep?.created_at.toISOString()})`)
    console?.log(`   ❌ Removing: ${toRemove?.length} older entries`)

    for (const entry of toRemove) {
      removedIds?.push(entry?.id)
      console?.log(`      - ${entry?.id} (created: ${entry?.created_at.toISOString()})`)
    }

    // Actually delete if not dry run
    if (!dryRun && toRemove?.length > 0) {
      const idsToDelete = toRemove?.map((e) => e?.id)
      const { error } = await supabase?.from('events').delete().in('id', idsToDelete)

      if (error) {
        console?.error(`   ⚠️  Error removing duplicates: ${error?.message}`)
      } else {
        console?.log(`   ✅ Successfully deleted ${toRemove?.length} duplicates`)
      }
    }
  }

  console?.log('\n' + '─'.repeat(80))
  console?.log(`\n📊 Summary:`)
  console?.log(`   Total duplicate groups: ${duplicates?.length}`)
  console?.log(`   Entries kept (newest): ${totalKept}`)
  console?.log(`   Entries to remove: ${totalRemoved}`)

  if (dryRun) {
    console?.log(`\n💡 This was a dry run. Run with --execute to actually remove duplicates.`)
  } else {
    console?.log(`\n✅ Cleanup complete! Removed ${totalRemoved} duplicate entries.`)
  }

  return { removed: totalRemoved, kept: totalKept, removedIds }
}

/**
 * Main execution
 */
async function main() {
  const args = process?.argv.slice(2)
  const dryRun = !args?.includes('--execute')

  console?.log('╔═══════════════════════════════════════════════════════════╗')
  console?.log('║          Event Duplicate Cleanup Script                  ║')
  console?.log('╚═══════════════════════════════════════════════════════════╝\n')

  if (dryRun) {
    console?.log('⚠️  Running in DRY RUN mode - no changes will be made')
    console?.log('💡 Use --execute flag to actually remove duplicates\n')
  } else {
    console?.log('⚠️  EXECUTING - duplicates will be permanently removed!\n')
  }

  try {
    // Find duplicates
    const duplicates = await findDuplicates()

    if (duplicates?.length === 0) {
      console?.log('\n✅ No duplicates found. Database is clean!')
      process?.exit(0)
    }

    // Show top duplicates
    console?.log('\n📋 Top 10 duplicate groups:')
    console?.log('─'.repeat(80))
    duplicates
      .sort((a, b) => b?.count - a?.count)
      .slice(0, 10)
      .forEach((group, index) => {
        console?.log(
          `${index + 1}. "${group?.title.substring(0, 50)}${group?.title.length > 50 ? '...' : ''}" - ${group?.count} duplicates`
        )
      })

    // Remove duplicates
    if (args.includes('--remove')) {
      console?.log('\n🗑️  Removing duplicates...')
      console?.log('─'.repeat(80))

      let removedCount = 0
      for (const group of duplicates) {
        if (group?.count > 1) {
          // Keep the first event, remove the rest
          const eventsToRemove = group?.ids?.slice(1) || []

          for (const eventId of eventsToRemove) {
            try {
              const { error } = await supabase.from('events').delete().eq('id', eventId)

              if (error) {
                console?.log(`❌ Failed to remove event ${eventId}: ${error?.message}`)
              } else {
                removedCount++
                console?.log(`✅ Removed duplicate event: ${eventId}`)
              }
            } catch (err) {
              console?.log(`❌ Error removing event ${eventId}:`, err)
            }
          }
        }
      }

      console?.log(`\n🎉 Cleanup complete! Removed ${removedCount} duplicate events.`)
    } else {
      console?.log('\n💡 To actually remove duplicates, run with --remove flag')
      console?.log('   Example: npm run test:events:cleanup -- --remove')
    }
  } catch (error) {
    console?.error('❌ Error during cleanup:', error)
    process?.exit(1)
  }
}

// Run the script
main()
