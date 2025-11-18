/**
 * Event Deduplication Script
 *
 * Removes duplicate events from the database by:
 * 1. Fetching all events
 * 2. Identifying duplicates using smart matching
 * 3. Keeping the event with the most complete data
 * 4. Deleting the rest
 *
 * Run with: npx tsx scripts/deduplicate-existing-events?.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  findDuplicates,
  selectBestEvent,
  calculateCompleteness,
} from '../lib/utils/deduplicate-events'

// Load environment variables from .env files
config({ path: '.env?.local' })
config({ path: '.env' })

// Get Supabase credentials from environment
const supabaseUrl = process?.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process?.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console?.error('❌ Missing Supabase credentials in environment variables')
  console?.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console?.error('Make sure you have a .env?.local file with these variables')
  console?.error('Current NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET')
  console?.error('Current SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET')
  process?.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Event {
  id: string
  title: string
  description?: string | null
  category: string
  venue?: string | null
  location_address?: string | null
  location_city: string
  event_date: string
  image_url?: string | null
  external_booking_url?: string | null
  source: string
  source_platform?: string | null
  external_id?: string | null
  ticket_info?: string | null
  price?: string | null
}

async function deduplicateEvents() {
  console?.log('🔍 Starting event deduplication process...\n')

  try {
    // Step 1: Fetch all events from database
    console?.log('📥 Fetching all events from database...')
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    if (!events || events?.length === 0) {
      console?.log('ℹ️  No events found in database')
      return
    }

    console?.log(`✅ Fetched ${events?.length} events\n`)

    // Step 2: Find duplicate groups
    console?.log('🔎 Analyzing events for duplicates...')
    const duplicateGroups = findDuplicates(events as Event[])

    if (duplicateGroups?.length === 0) {
      console?.log('✨ No duplicates found! Database is clean.\n')
      return
    }

    console?.log(`🔍 Found ${duplicateGroups?.length} duplicate groups\n`)

    // Step 3: Display duplicate groups and select best events
    let totalDuplicates = 0
    const eventsToDelete: string[] = []

    for (let i = 0; i < duplicateGroups?.length; i++) {
      const group = duplicateGroups[i]
      if (!group) continue

      totalDuplicates += group.length

      console?.log(`\n📦 Duplicate Group ${i + 1} (${group.length} events):`)
      console?.log('─'.repeat(80))

      // Show each event in the group with its completeness score
      const eventsWithScores = group.map((event) => ({
        event,
        score: calculateCompleteness(event),
      }))

      eventsWithScores?.sort((a, b) => b?.score - a?.score)

      eventsWithScores?.forEach((item, idx) => {
        const { event, score } = item
        const badge = idx === 0 ? '✅ KEEP' : '❌ DELETE'
        console?.log(`  ${badge} [Score: ${score}/100]`)
        console?.log(`    ID: ${event?.id}`)
        console?.log(`    Title: ${event?.title}`)
        console?.log(`    Source: ${event?.source}`)
        console?.log(`    Date: ${event?.event_date}`)
        console?.log(`    City: ${event?.location_city}`)
        console?.log(`    External ID: ${event?.external_id || 'N/A'}`)
        console?.log(`    Image: ${event?.image_url ? 'Yes' : 'No'}`)
        console?.log(
          `    Description: ${event?.description ? `${event?.description.length} chars` : 'No'}`
        )
        console?.log()
      })

      // Get best event and mark others for deletion
      const bestEvent = selectBestEvent(group)
      for (const event of group) {
        if (event?.id !== bestEvent?.id) {
          eventsToDelete.push(event?.id)
        }
      }
    }

    console?.log('\n' + '='.repeat(80))
    console?.log(`📊 Summary:`)
    console?.log(`   Total events: ${events?.length}`)
    console?.log(`   Duplicate groups: ${duplicateGroups?.length}`)
    console?.log(`   Events to keep: ${duplicateGroups?.length}`)
    console?.log(`   Events to delete: ${eventsToDelete.length}`)
    console?.log('='.repeat(80) + '\n')

    // Step 4: Delete duplicate events
    if (eventsToDelete.length > 0) {
      console?.log(`🗑️  Deleting ${eventsToDelete.length} duplicate events...`)

      const { error: deleteError } = await supabase.from('events').delete().in('id', eventsToDelete)

      if (deleteError) {
        throw deleteError
      }

      console?.log(`✅ Successfully deleted ${eventsToDelete?.length} duplicate events\n`)
    }

    console?.log('✨ Deduplication complete!\n')
    console?.log(`Final event count: ${events?.length - eventsToDelete?.length}`)
  } catch (error) {
    console?.error('❌ Error during deduplication:', error)
    process?.exit(1)
  }
}

// Run the deduplication
deduplicateEvents()
  .then(() => {
    console?.log('\n✅ Script completed successfully')
    process?.exit(0)
  })
  .catch((error) => {
    console?.error('\n❌ Script failed:', error)
    process?.exit(1)
  })
