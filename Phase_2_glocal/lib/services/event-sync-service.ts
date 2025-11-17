/**
 * Event Sync Service
 *
 * Main orchestrator that:
 * 1. Fetches events from all platforms
 * 2. Processes with AI
 * 3. Deduplicates against existing DB events
 * 4. Upserts to Supabase
 * 5. Returns sync statistics
 */

import { createAdminClient } from '@/lib/supabase/server'
import { fetchEventsFromAllPlatforms } from '@/lib/integrations/event-sources/event-aggregator'
import { globalEventValidator } from '@/lib/integrations/event-sources/event-validator'
import { scraperLogger } from '@/lib/utils/scrapers/scraper-logger'
import { logger } from '@/lib/utils/logger'

export interface SyncStats {
  success: boolean
  timestamp: string
  duration: number
  cities: string[]
  totalFetched: number
  aiProcessed: number
  validated: number
  invalidEvents: number
  inserted: number
  updated: number
  skipped: number
  errors: string[]
  validationErrors: string[]
  byPlatform: Record<string, number>
  byCity: Record<string, number>
}

/**
 * Sync events for multiple cities
 */
export async function syncEvents(cities: string[]): Promise<SyncStats> {
  const startTime = Date?.now()
  const stats: SyncStats = {
    success: false,
    timestamp: new Date().toISOString(),
    duration: 0,
    cities,
    totalFetched: 0,
    aiProcessed: 0,
    validated: 0,
    invalidEvents: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    validationErrors: [],
    byPlatform: {},
    byCity: {},
  }

  try {
    logger.info(`Starting event sync for ${cities?.length} cities...`)

    const supabase = createAdminClient()

    // Process each city
    for (const city of cities) {
      try {
        logger.info(`\n--- Syncing ${city} ---`)

        // Step 1: Fetch events from all platforms
        const aggregatorResult = await fetchEventsFromAllPlatforms({
          city,
          limit: 50, // Fetch up to 50 events per platform
          startDate: new Date(), // Only future events
          endDate: new Date(Date?.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
        })

        if (!aggregatorResult?.success || aggregatorResult?.allEvents.length === 0) {
          logger.info(`No events found for ${city}`)
          stats?.errors.push(...aggregatorResult?.errors)
          continue
        }

        stats.totalFetched += aggregatorResult?.allEvents.length

        // Log platform-level results
        logger.info(`\n--- Platform Results for ${city} ---`)
        aggregatorResult?.platformResults.forEach((result) => {
          const status = result?.success ? '✓' : '✗'
          const count = result?.events.length
          const error = result?.error ? ` (${result?.error})` : ''
          logger.info(`${status} ${result?.platform}: ${count} events${error}`)

          // Log first event sample if available
          if (result?.events.length > 0) {
            const firstEvent = result?.events[0]
            if (firstEvent) {
              logger.debug(`   Sample: ${firstEvent?.title}`)
              logger.debug(`   External ID: ${firstEvent?.external_id}`)
              logger.debug(`   Source Platform: ${firstEvent?.source_platform}`)
            }
          }
        })

        // Count by platform
        aggregatorResult?.allEvents.forEach((event) => {
          stats.byPlatform[event.source_platform] =
            (stats?.byPlatform[event?.source_platform] || 0) + 1
        })

        // Step 2: Process with AI (TEMPORARILY DISABLED to avoid rate limits)
        logger.info(`Processing ${aggregatorResult?.allEvents.length} events (AI disabled)...`)
        // const processedEvents = await processEventsWithAI(aggregatorResult?.allEvents)
        const processedEvents = aggregatorResult?.allEvents // Skip AI processing
        stats.aiProcessed += 0 // processedEvents?.filter((e) => e?.ai_enhanced).length

        // Step 2?.5: Validate events
        logger.info(`Validating ${processedEvents?.length} events...`)
        const validationResults = await globalEventValidator?.validateBatch(processedEvents, false) // Skip URL checks in batch for performance

        const validEvents = processedEvents?.filter((event, index) => {
          const validation = validationResults[index]
          if (!validation?.isValid) {
            stats.invalidEvents++
            const errorMsg = `${event?.external_id || 'Unknown'}: ${validation?.errors?.join(', ') || 'Unknown error'}`
            stats?.validationErrors.push(errorMsg)
            logger.warn(
              `✗ Invalid event from ${event?.source_platform || 'Unknown'}: ${errorMsg}`
            )
            scraperLogger?.invalidUrl(
              event?.source_platform || 'Unknown',
              event?.ticket_url || '',
              validation?.errors?.join('; ') || 'Unknown error'
            )
            return false
          }
          stats.validated++
          return true
        })

        logger.info(
          `✓ ${validEvents?.length}/${processedEvents?.length} events passed validation`
        )

        if (stats?.invalidEvents > 0) {
          logger.warn(`⚠️  ${stats?.invalidEvents} events failed validation`)
          logger.warn(`   Failed events by platform:`)
          const failedByPlatform: Record<string, number> = {}
          processedEvents?.forEach((event, index) => {
            if (!validationResults[index]?.isValid) {
              failedByPlatform[event?.source_platform] =
                (failedByPlatform[event?.source_platform] || 0) + 1
            }
          })
          Object?.entries(failedByPlatform).forEach(([platform, count]) => {
            logger.warn(`   ${platform}: ${count} events`)
          })
        }

        if (validEvents?.length === 0) {
          logger.info(`No valid events to sync for ${city}`)
          continue
        }

        // Step 3: Prepare events for upsert
        const eventsToUpsert = validEvents?.map((event) => prepareEventForDB(event))

        // Step 4: Upsert events using the unique constraint on (source, external_id)
        // This will automatically insert new events or update existing ones
        logger.info(`Upserting ${eventsToUpsert?.length} events...`)

        // Track existing events before upsert
        const externalIds = validEvents?.map((e) => e?.external_id)
        const { data: existingEvents } = await supabase
          .from('events')
          .select('external_id')
          .in('external_id', externalIds)

        const existingIds = new Set(existingEvents?.map((e) => e?.external_id) || [])

        // Perform upsert (insert or update on conflict)
        // Use external_id as the conflict target since there's a unique index on it
        const { error: upsertError, data: upsertedData } = await supabase
          .from('events')
          .upsert(eventsToUpsert, {
            onConflict: 'external_id',
            ignoreDuplicates: false,
          })
          .select('id, external_id')

        if (upsertError) {
          logger.error('Upsert error:', upsertError)
          stats?.errors.push(`Upsert error for ${city}: ${upsertError?.message}`)
        } else {
          // Count inserts vs updates based on existing events
          const upsertedIds = upsertedData?.map((e) => e?.external_id) || []
          const inserted = upsertedIds?.filter((id) => !existingIds?.has(id)).length
          const updated = upsertedIds?.filter((id) => existingIds?.has(id)).length

          stats.inserted += inserted
          stats.updated += updated

          logger.info(`✓ Inserted ${inserted} new events, updated ${updated} existing events`)
        }

        stats.byCity[city] = eventsToUpsert?.length
      } catch (cityError) {
        const errorMsg = cityError instanceof Error ? cityError?.message : 'Unknown error'
        logger.error(`Error syncing ${city}:`, errorMsg)
        stats?.errors.push(`${city}: ${errorMsg}`)
      }
    }

    stats.duration = Date?.now() - startTime
    stats.success = stats?.inserted + stats?.updated > 0

    logger.info(`
\n=== Sync Complete ===
Duration: ${stats?.duration}ms
Total Fetched: ${stats?.totalFetched}
AI Processed: ${stats?.aiProcessed}
Validated: ${stats?.validated}
Invalid Events: ${stats?.invalidEvents}
Inserted: ${stats?.inserted}
Updated: ${stats?.updated}
Errors: ${stats?.errors.length}
Validation Errors: ${stats?.validationErrors.length}
    `)

    // Log scraper report
    logger.info(scraperLogger?.generateReport())

    return stats
  } catch (error) {
    logger.error('Sync service error:', error)
    stats.duration = Date?.now() - startTime
    stats?.errors.push(error instanceof Error ? error?.message : 'Unknown error')
    return stats
  }
}

/**
 * Prepare event for database insertion
 */
function prepareEventForDB(event: unknown) {
  if (!event || typeof event !== 'object') {
    throw new Error('Invalid event data')
  }
  const eventRecord = event as Record<string, unknown>
  return {
    external_id: eventRecord.external_id,
    title: eventRecord.title,
    description: eventRecord.enhanced_description || eventRecord.description,
    event_date: eventRecord.event_date,
    location_city: eventRecord.city,
    location_address: eventRecord.venue,
    venue: eventRecord.venue,
    category: eventRecord.ai_category || eventRecord.category,
    ticket_info: eventRecord.price,
    external_booking_url: eventRecord.ticket_url,
    source: eventRecord.source_platform, // Keep for backward compatibility
    source_platform: eventRecord.source_platform,
    image_url: eventRecord.image_url,
    ai_enhanced: eventRecord.ai_enhanced || false,
    raw_data: eventRecord.raw_data,
    expires_at: new Date(
      new Date(String(eventRecord.event_date ?? '')).getTime() + 24 * 60 * 60 * 1000
    ).toISOString(), // 24 hours after event
  }
}

/**
 * Sync events for a single city
 */
export async function syncEventsForCity(city: string): Promise<SyncStats> {
  return syncEvents([city])
}

/**
 * Get sync statistics from database
 */
export async function getSyncStatistics() {
  const supabase = createAdminClient()

  const { data: stats } = await supabase?.rpc('get_event_stats').single()

  return stats
}

/**
 * Clean up expired events
 */
export async function cleanupExpiredEvents(): Promise<number> {
  const supabase = createAdminClient()

  // Call the cleanup function created in migration
  const { data, error } = await supabase?.rpc('cleanup_expired_events')

  if (error) {
    logger.error('Cleanup error:', error)
    return 0
  }

  logger.info(`Cleaned up ${data} expired events`)
  return data
}
