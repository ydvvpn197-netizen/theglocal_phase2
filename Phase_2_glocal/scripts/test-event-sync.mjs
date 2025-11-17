#!/usr/bin/env node

/**
 * Test Event Sync Script
 * 
 * Manually trigger event sync for testing purposes
 * Usage: node scripts/test-event-sync.mjs [cities...]
 * Example: node scripts/test-event-sync.mjs Mumbai Delhi Bengaluru
 */

import 'dotenv/config'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function testSync(cities = ['Mumbai', 'Delhi', 'Bengaluru']) {
  console.log('🚀 Testing Event Sync System\n')
  console.log(`Target URL: ${BASE_URL}`)
  console.log(`Cities: ${cities.join(', ')}\n`)

  try {
    // Test sync endpoint
    console.log('📥 Fetching events from all platforms...')
    const syncResponse = await fetch(`${BASE_URL}/api/events/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cities }),
    })

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResponse.status} ${syncResponse.statusText}`)
    }

    const syncData = await syncResponse.json()

    console.log('\n✅ Sync Complete!\n')
    console.log('📊 Sync Statistics:')
    console.log('─────────────────────────────────────')
    console.log(`Total Fetched:    ${syncData.stats.totalFetched}`)
    console.log(`AI Processed:     ${syncData.stats.aiProcessed}`)
    console.log(`Inserted:         ${syncData.stats.inserted}`)
    console.log(`Updated:          ${syncData.stats.updated}`)
    console.log(`Duration:         ${syncData.stats.duration}ms`)
    console.log('─────────────────────────────────────')

    if (syncData.stats.byPlatform) {
      console.log('\n📍 By Platform:')
      Object.entries(syncData.stats.byPlatform).forEach(([platform, count]) => {
        console.log(`  ${platform.padEnd(15)}: ${count}`)
      })
    }

    if (syncData.stats.byCity) {
      console.log('\n🌆 By City:')
      Object.entries(syncData.stats.byCity).forEach(([city, count]) => {
        console.log(`  ${city.padEnd(15)}: ${count}`)
      })
    }

    if (syncData.stats.errors && syncData.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:')
      syncData.stats.errors.forEach((error) => {
        console.log(`  - ${error}`)
      })
    }

    console.log('\n✨ Sync test completed successfully!')
    return true
  } catch (error) {
    console.error('\n❌ Sync test failed:', error.message)
    return false
  }
}

async function testCleanup() {
  console.log('\n🧹 Testing Cleanup Function\n')

  try {
    const cleanupResponse = await fetch(`${BASE_URL}/api/events/cleanup`, {
      method: 'POST',
    })

    if (!cleanupResponse.ok) {
      throw new Error(`Cleanup failed: ${cleanupResponse.status}`)
    }

    const cleanupData = await cleanupResponse.json()

    console.log('✅ Cleanup Complete!')
    console.log(`Deleted ${cleanupData.data.deletedCount} expired events\n`)

    return true
  } catch (error) {
    console.error('❌ Cleanup test failed:', error.message)
    return false
  }
}

async function testEventsFetch(city = 'Mumbai') {
  console.log(`\n📋 Testing Events API (${city})\n`)

  try {
    const response = await fetch(`${BASE_URL}/api/events?city=${city}&limit=10`)

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`)
    }

    const data = await response.json()

    console.log('✅ Events fetched successfully!')
    console.log(`Total events: ${data.data.length}`)

    if (data.data.length > 0) {
      console.log('\nSample Events:')
      data.data.slice(0, 3).forEach((event, idx) => {
        console.log(`\n${idx + 1}. ${event.title}`)
        console.log(`   Source: ${event.source || event.source_platform}`)
        console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`)
        console.log(`   Venue: ${event.venue}`)
      })
    }

    return true
  } catch (error) {
    console.error('❌ Events fetch failed:', error.message)
    return false
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Event Sync Test Script

Usage:
  node scripts/test-event-sync.mjs [cities...]
  node scripts/test-event-sync.mjs --cleanup
  node scripts/test-event-sync.mjs --fetch [city]
  node scripts/test-event-sync.mjs --all

Options:
  --cleanup    Test cleanup function only
  --fetch      Test events fetch API
  --all        Run all tests
  --help, -h   Show this help message

Examples:
  node scripts/test-event-sync.mjs Mumbai Delhi
  node scripts/test-event-sync.mjs --cleanup
  node scripts/test-event-sync.mjs --fetch Bengaluru
  node scripts/test-event-sync.mjs --all
    `)
    process.exit(0)
  }

  if (args.includes('--cleanup')) {
    await testCleanup()
  } else if (args.includes('--fetch')) {
    const city = args[args.indexOf('--fetch') + 1] || 'Mumbai'
    await testEventsFetch(city)
  } else if (args.includes('--all')) {
    const syncSuccess = await testSync(['Mumbai', 'Delhi', 'Bengaluru'])
    if (syncSuccess) {
      await testCleanup()
      await testEventsFetch('Mumbai')
    }
  } else {
    const cities = args.length > 0 ? args : ['Mumbai', 'Delhi', 'Bengaluru']
    await testSync(cities)
  }
}

main()

