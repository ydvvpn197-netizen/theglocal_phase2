/**
 * Platform Scraper Testing Script
 *
 * Tests each event scraper individually to identify failures
 * Run: npx tsx scripts/test-platform-scrapers.ts
 */

// import { fetchBookMyShowEvents } from '../lib/integrations/event-sources/bookmyshow' // Temporarily disabled - file missing
import { fetchInsiderEvents } from '../lib/integrations/event-sources/insider'
import { fetchAlleventsEvents } from '../lib/integrations/event-sources/allevents'
import type { FetchConfig } from '../lib/integrations/event-sources/types'

const testConfig: FetchConfig = {
  city: 'Mumbai',
  limit: 10,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
}

interface TestResult {
  platform: string
  success: boolean
  eventCount: number
  error?: string
  duration: number
  events?: Array<Record<string, unknown>>
}

async function testPlatform(
  platformName: string,
  fetchFunction: (config: FetchConfig) => Promise<unknown>
): Promise<TestResult> {
  console.log(`\n🧪 Testing ${platformName}...`)
  const startTime = Date.now()

  try {
    interface FetchResult {
      success?: boolean
      events?: Array<Record<string, unknown>>
      error?: string
    }
    const result = (await fetchFunction(testConfig)) as FetchResult
    const duration = Date.now() - startTime

    if (result.success && result.events) {
      console.log(`✅ ${platformName}: SUCCESS`)
      console.log(`   Events fetched: ${result.events.length}`)
      console.log(`   Duration: ${duration}ms`)

      // Show first event as sample
      if (result.events.length > 0) {
        const sample = result.events[0] as Record<string, unknown>
        console.log(`   Sample event:`)
        console.log(`     - Title: ${sample.title}`)
        console.log(`     - Date: ${sample.event_date}`)
        console.log(`     - City: ${sample.city}`)
        console.log(`     - External ID: ${sample.external_id}`)
      }

      return {
        platform: platformName,
        success: true,
        eventCount: result.events.length,
        duration,
        events: result.events,
      }
    } else {
      console.log(`❌ ${platformName}: FAILED`)
      console.log(`   Error: ${result.error || 'Unknown error'}`)
      console.log(`   Duration: ${duration}ms`)

      return {
        platform: platformName,
        success: false,
        eventCount: 0,
        error: result.error || 'Unknown error',
        duration,
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.log(`❌ ${platformName}: EXCEPTION`)
    console.log(`   Error: ${errorMessage}`)
    console.log(`   Duration: ${duration}ms`)

    return {
      platform: platformName,
      success: false,
      eventCount: 0,
      error: errorMessage,
      duration,
    }
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║      Platform Scraper Testing Script                     ║')
  console.log('╚═══════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`Test Configuration:`)
  console.log(`  City: ${testConfig.city}`)
  console.log(`  Limit: ${testConfig.limit} events per platform`)
  console.log(
    `  Date Range: ${testConfig.startDate?.toISOString().split('T')[0] || 'N/A'} to ${testConfig.endDate?.toISOString().split('T')[0] || 'N/A'}`
  )
  console.log('')

  const results: TestResult[] = []

  // Test each platform
  // results.push(await testPlatform('BookMyShow', fetchBookMyShowEvents)) // Temporarily disabled - file missing
  results.push(await testPlatform('Insider', fetchInsiderEvents))
  results.push(await testPlatform('AllEvents', fetchAlleventsEvents))

  // Summary
  console.log('\n' + '═'.repeat(80))
  console.log('📊 TEST SUMMARY')
  console.log('═'.repeat(80))

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`)
  successful.forEach((r) => {
    console.log(`   - ${r.platform}: ${r.eventCount} events (${r.duration}ms)`)
  })

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
    failed.forEach((r) => {
      console.log(`   - ${r.platform}: ${r.error}`)
    })
  }

  console.log('\n' + '═'.repeat(80))
  console.log('🔍 DIAGNOSIS')
  console.log('═'.repeat(80))

  if (failed.length === 0) {
    console.log('\n✨ All platforms working correctly!')
  } else {
    console.log('\n⚠️  Issues detected:')
    failed.forEach((r) => {
      console.log(`\n${r.platform}:`)
      console.log(`  Error: ${r.error}`)
      console.log(`  Possible causes:`)

      if (r.error?.includes('fetch') || r.error?.includes('network')) {
        console.log(`    - Network connectivity issues`)
        console.log(`    - Website is down or blocking requests`)
        console.log(`    - Rate limiting in effect`)
      }

      if (r.error?.includes('selector') || r.error?.includes('parse')) {
        console.log(`    - Website structure changed (selectors outdated)`)
        console.log(`    - Unexpected HTML format`)
      }

      if (r.error?.includes('API') || r.error?.includes('401') || r.error?.includes('403')) {
        console.log(`    - API authentication issues`)
        console.log(`    - Invalid or expired API keys`)
      }

      console.log(`  Recommended actions:`)
      console.log(`    - Check if website/API is accessible`)
      console.log(`    - Verify API keys (if applicable)`)
      console.log(`    - Inspect HTML selectors in scraper code`)
      console.log(`    - Add error handling and retries`)
    })
  }

  console.log('\n' + '═'.repeat(80))
  console.log('💡 NEXT STEPS')
  console.log('═'.repeat(80))

  if (successful.length > 0) {
    console.log('\n✓ Working platforms will continue to sync events')
    console.log(`  Run: POST /api/events/sync to trigger manual sync`)
  }

  if (failed.length > 0) {
    console.log('\n✗ Failed platforms need attention:')
    console.log(`  1. Review scraper code for failed platforms`)
    console.log(`  2. Test manually by visiting platform websites`)
    console.log(`  3. Update selectors/API calls as needed`)
    console.log(`  4. Re-run this test script to verify fixes`)
  }

  console.log('')

  // Exit with error code if any platform failed
  process.exit(failed.length > 0 ? 1 : 0)
}

// Run the tests
main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
