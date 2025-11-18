#!/usr/bin/env node

/**
 * Test Scraping & Validation Script
 * 
 * Tests individual platforms, validates URLs, and reports success rates
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

// Import after env is loaded
const { fetchInsiderEvents, closeBrowser } = await import('../lib/integrations/event-sources/insider.ts')
const { fetchAlleventsEvents } = await import('../lib/integrations/event-sources/allevents.ts')
const { fetchEventbriteEvents } = await import('../lib/integrations/event-sources/eventbrite.ts')
const { fetchMeetupEvents } = await import('../lib/integrations/event-sources/meetup.ts')
const { fetchPaytmInsiderEvents } = await import('../lib/integrations/event-sources/paytm-insider.ts')
const { globalEventValidator } = await import('../lib/integrations/event-sources/event-validator.ts')
const { globalURLValidator } = await import('../lib/utils/url-validator.ts')
const { scraperLogger } = await import('../lib/utils/scraper-logger.ts')

// Parse command line arguments
const args = process.argv.slice(2)
const flags = {
  platform: args.find(arg => arg.startsWith('--platform='))?.split('=')[1] || 'all',
  city: args.find(arg => arg.startsWith('--city='))?.split('=')[1] || 'Mumbai',
  limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '10'),
  validateUrls: args.includes('--validate-urls'),
  validateOnly: args.includes('--validate-urls-only'),
  help: args.includes('--help') || args.includes('-h'),
}

// Show help
if (flags.help) {
  console.log(`
Test Scraping & Validation Script

Usage:
  node scripts/test-scraping-validation.mjs [options]

Options:
  --platform=<name>      Test specific platform (insider|allevents|eventbrite|meetup|paytm-insider|all)
  --city=<name>          City to test (default: Mumbai)
  --limit=<number>       Number of events to fetch (default: 10)
  --validate-urls        Perform deep URL validation (slower)
  --validate-urls-only   Only validate URLs without scraping
  --help, -h             Show this help message

Examples:
  node scripts/test-scraping-validation.mjs --platform=insider --city=Mumbai
  node scripts/test-scraping-validation.mjs --platform=all --limit=5
  node scripts/test-scraping-validation.mjs --validate-urls --city=Delhi
  `)
  process.exit(0)
}

console.log('\n🧪 Starting Scraping & Validation Tests\n')
console.log(`Platform: ${flags.platform}`)
console.log(`City: ${flags.city}`)
console.log(`Limit: ${flags.limit}`)
console.log(`URL Validation: ${flags.validateUrls ? 'Enabled' : 'Disabled'}\n`)

/**
 * Test a platform
 */
async function testPlatform(name, fetchFunction) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing ${name.toUpperCase()}`)
  console.log('='.repeat(60))

  const startTime = Date.now()

  try {
    // Fetch events
    console.log(`\n📥 Fetching events from ${name}...`)
    const result = await fetchFunction({
      city: flags.city,
      limit: flags.limit,
    })

    const duration = Date.now() - startTime

    if (!result.success) {
      console.error(`\n❌ Failed to fetch events: ${result.error}`)
      return {
        platform: name,
        success: false,
        error: result.error,
        duration,
      }
    }

    console.log(`✅ Fetched ${result.events.length} events in ${duration}ms`)

    if (result.events.length === 0) {
      console.log(`\n⚠️  No events found for ${flags.city}`)
      return {
        platform: name,
        success: true,
        eventCount: 0,
        duration,
      }
    }

    // Show sample events
    console.log(`\n📋 Sample Events:`)
    result.events.slice(0, 3).forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.title}`)
      console.log(`   Venue: ${event.venue}`)
      console.log(`   Date: ${new Date(event.event_date).toLocaleString()}`)
      console.log(`   Price: ${event.price}`)
      console.log(`   URL: ${event.ticket_url}`)
      console.log(`   Image: ${event.image_url ? 'Yes' : 'No'}`)
    })

    // Validate events
    console.log(`\n🔍 Validating ${result.events.length} events...`)
    const validationResults = await globalEventValidator.validateBatch(
      result.events,
      flags.validateUrls
    )

    const validCount = validationResults.filter(v => v.isValid).length
    const invalidCount = validationResults.filter(v => !v.isValid).length
    const successRate = ((validCount / result.events.length) * 100).toFixed(2)

    console.log(`\n📊 Validation Results:`)
    console.log(`   Valid: ${validCount}/${result.events.length} (${successRate}%)`)
    console.log(`   Invalid: ${invalidCount}`)

    // Show validation errors
    if (invalidCount > 0) {
      console.log(`\n❌ Validation Errors:`)
      validationResults
        .filter(v => !v.isValid)
        .slice(0, 5)
        .forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.sanitizedEvent.title}`)
          result.errors.forEach(error => console.log(`   • ${error}`))
        })
    }

    // Show validation warnings
    const warningsCount = validationResults.reduce((sum, v) => sum + v.warnings.length, 0)
    if (warningsCount > 0) {
      console.log(`\n⚠️  Validation Warnings: ${warningsCount}`)
      validationResults
        .filter(v => v.warnings.length > 0)
        .slice(0, 3)
        .forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.sanitizedEvent.title}`)
          result.warnings.forEach(warning => console.log(`   • ${warning}`))
        })
    }

    // URL validation
    if (flags.validateUrls) {
      console.log(`\n🔗 Deep URL Validation...`)
      const urlsToTest = result.events
        .map(e => e.ticket_url)
        .filter(Boolean)
        .slice(0, 5)

      for (const url of urlsToTest) {
        const urlResult = await globalURLValidator.isAccessible(url, false)
        const status = urlResult.isValid ? '✅' : '❌'
        console.log(`   ${status} ${url} ${urlResult.statusCode ? `(${urlResult.statusCode})` : ''}`)
      }
    }

    return {
      platform: name,
      success: true,
      eventCount: result.events.length,
      validCount,
      invalidCount,
      successRate: parseFloat(successRate),
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`\n❌ Error testing ${name}:`, error.message)
    return {
      platform: name,
      success: false,
      error: error.message,
      duration,
    }
  }
}

/**
 * Main test function
 */
async function main() {
  const results = []

  try {
    // Test platforms
    const platforms = {
      insider: fetchInsiderEvents,
      allevents: fetchAlleventsEvents,
      eventbrite: fetchEventbriteEvents,
      meetup: fetchMeetupEvents,
      'paytm-insider': fetchPaytmInsiderEvents,
    }

    if (flags.platform === 'all') {
      for (const [name, fn] of Object.entries(platforms)) {
        const result = await testPlatform(name, fn)
        results.push(result)
      }
    } else if (platforms[flags.platform]) {
      const result = await testPlatform(flags.platform, platforms[flags.platform])
      results.push(result)
    } else {
      console.error(`❌ Unknown platform: ${flags.platform}`)
      console.log(`Available platforms: ${Object.keys(platforms).join(', ')}, all`)
      process.exit(1)
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))

    const totalEvents = results.reduce((sum, r) => sum + (r.eventCount || 0), 0)
    const totalValid = results.reduce((sum, r) => sum + (r.validCount || 0), 0)
    const totalInvalid = results.reduce((sum, r) => sum + (r.invalidCount || 0), 0)
    const avgSuccessRate = results
      .filter(r => r.successRate !== undefined)
      .reduce((sum, r) => sum + r.successRate, 0) / results.filter(r => r.successRate !== undefined).length || 0

    console.log(`\nPlatforms Tested: ${results.length}`)
    console.log(`Total Events: ${totalEvents}`)
    console.log(`Valid Events: ${totalValid}`)
    console.log(`Invalid Events: ${totalInvalid}`)
    console.log(`Average Success Rate: ${avgSuccessRate.toFixed(2)}%`)

    console.log(`\nPer-Platform Results:`)
    results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      const rate = result.successRate !== undefined ? `${result.successRate}%` : 'N/A'
      console.log(`  ${status} ${result.platform}: ${result.eventCount || 0} events, ${rate} valid (${result.duration}ms)`)
    })

    // Scraper logger report
    console.log('\n')
    console.log(scraperLogger.generateReport())

    // URL validator cache stats
    console.log('\n📈 URL Validator Cache Stats:')
    const cacheStats = globalURLValidator.getCacheStats()
    console.log(`   Total: ${cacheStats.total}`)
    console.log(`   Valid: ${cacheStats.valid}`)
    console.log(`   Invalid: ${cacheStats.invalid}`)
    console.log(`   Expired: ${cacheStats.expired}`)

    console.log('\n✨ Testing complete!\n')
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  } finally {
    // Close browser if it was opened
    try {
      await closeBrowser()
    } catch (e) {
      // Ignore
    }
  }
}

// Run main function
main()

