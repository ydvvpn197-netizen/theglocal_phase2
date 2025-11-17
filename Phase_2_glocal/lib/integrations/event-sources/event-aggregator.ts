/**
 * Event Aggregator
 *
 * Unified interface to fetch events from all platforms in parallel
 * Handles errors gracefully - if one platform fails, others continue
 */

import { logger } from '@/lib/utils/logger'
import { StandardizedEvent, FetchConfig, PlatformFetchResult } from './types'
import { fetchInsiderEvents } from './insider'
import { fetchAlleventsEvents } from './allevents'
import { fetchPaytmInsiderEvents } from './paytm-insider'
import { fetchExplaraEvents } from './explara'
import { fetchTownscriptEvents } from './townscript'

export interface AggregatorResult {
  success: boolean
  totalEvents: number
  platformResults: PlatformFetchResult[]
  allEvents: StandardizedEvent[]
  errors: string[]
}

/**
 * Fetch events from all platforms in parallel
 */
export async function fetchEventsFromAllPlatforms(config: FetchConfig): Promise<AggregatorResult> {
  const startTime = Date.now()

  try {
    // Fetch from all platforms in parallel
    const results = await Promise.allSettled([
      fetchInsiderEvents(config),
      fetchAlleventsEvents(config),
      fetchPaytmInsiderEvents(config),
      fetchExplaraEvents(config),
      fetchTownscriptEvents(config),
    ])

    // Process results
    const platformResults: PlatformFetchResult[] = []
    const allEvents: StandardizedEvent[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      const platformName = ['Insider', 'Allevents', 'Paytm Insider', 'Explara', 'Townscript'][index]

      if (result.status === 'fulfilled') {
        const platformResult = result.value
        platformResults.push(platformResult)

        if (platformResult.success) {
          allEvents.push(...platformResult.events)
          logger.info(`✓ ${platformName}: ${platformResult.events.length} events`)
        } else {
          errors.push(`${platformName}: ${platformResult.error}`)
          logger.warn(`✗ ${platformName}: ${platformResult.error}`)
        }
      } else {
        const errorDetail =
          result.reason instanceof Error
            ? `${result.reason.message}\n${result.reason.stack}`
            : String(result.reason)
        errors.push(`${platformName}: ${errorDetail}`)
        logger.error(`✗ ${platformName} failed:`, errorDetail)
      }
    })

    const duration = Date.now() - startTime

    logger.info(`
Event Aggregation Complete:
- Total events: ${allEvents.length}
- Platforms succeeded: ${platformResults.filter((r) => r.success).length}/5
- Duration: ${duration}ms
${errors.length > 0 ? `- Errors: ${errors.join(', ')}` : ''}
    `)

    return {
      success: allEvents.length > 0,
      totalEvents: allEvents.length,
      platformResults,
      allEvents,
      errors,
    }
  } catch (error) {
    logger.error('Event aggregation error:', error)
    return {
      success: false,
      totalEvents: 0,
      platformResults: [],
      allEvents: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Fetch events from specific platforms only
 */
export async function fetchEventsFromPlatforms(
  config: FetchConfig,
  platforms: Array<'insider' | 'allevents' | 'paytm-insider'>
): Promise<AggregatorResult> {
  const platformFunctions = {
    insider: fetchInsiderEvents,
    allevents: fetchAlleventsEvents,
    'paytm-insider': fetchPaytmInsiderEvents,
  }

  const selectedFunctions = platforms.map((platform) => platformFunctions[platform](config))

  const results = await Promise.allSettled(selectedFunctions)

  const platformResults: PlatformFetchResult[] = []
  const allEvents: StandardizedEvent[] = []
  const errors: string[] = []

  results.forEach((result, index) => {
    const platformName = platforms[index]

    if (result.status === 'fulfilled') {
      const platformResult = result.value
      platformResults.push(platformResult)

      if (platformResult.success) {
        allEvents.push(...platformResult.events)
      } else {
        errors.push(`${platformName}: ${platformResult.error}`)
      }
    } else {
      errors.push(`${platformName}: ${result.reason}`)
    }
  })

  return {
    success: allEvents.length > 0,
    totalEvents: allEvents.length,
    platformResults,
    allEvents,
    errors,
  }
}

/**
 * Get statistics about event sources
 */
export function getAggregatorStats(result: AggregatorResult) {
  const stats = {
    total: result.totalEvents,
    byPlatform: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byCity: {} as Record<string, number>,
  }

  result.allEvents.forEach((event) => {
    // Count by platform
    stats.byPlatform[event.source_platform] = (stats.byPlatform[event.source_platform] || 0) + 1

    // Count by category
    stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1

    // Count by city
    stats.byCity[event.city] = (stats.byCity[event.city] || 0) + 1
  })

  return stats
}
