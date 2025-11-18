/**
 * Geocoding Utilities
 * Core functions for geocoding with Google Maps API, queue management, and retry logic
 */

import { logger } from '@/lib/utils/logger'
import { convertCoordinatesToPostGIS } from './location'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface GeocodeResult {
  latitude: number
  longitude: number
  formatted_address: string
}

export interface GeocodeQueueItem {
  id: string
  table_name: string
  record_id: string
  city: string
  attempt_count: number
  last_attempt_at: string | null
  error_message: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

const GOOGLE_API_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

/**
 * Calculate exponential backoff delay in milliseconds
 * @param attemptCount Number of attempts made
 * @returns Delay in milliseconds
 */
export function getBackoffDelay(attemptCount: number): number {
  // Exponential backoff: 1min, 5min, 15min
  if (attemptCount === 0) return 0
  if (attemptCount === 1) return 60 * 1000 // 1 minute
  if (attemptCount === 2) return 5 * 60 * 1000 // 5 minutes
  return 15 * 60 * 1000 // 15 minutes
}

/**
 * Geocode a city name using Google Geocoding API
 * @param city City name to geocode
 * @returns GeocodeResult or null if failed
 */
export async function geocodeCity(city: string): Promise<GeocodeResult | null> {
  if (!GOOGLE_API_KEY) {
    logger.error('GOOGLE_GEOCODING_API_KEY not found in environment')
    return null
  }

  if (!city || typeof city !== 'string' || city.trim() === '') {
    logger.warn('Invalid city name provided:', city)
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city.trim())}&key=${GOOGLE_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) {
      logger.error(`Geocoding HTTP error for ${city}:`, response.status, response.statusText)
      return null
    }

    const data = (await response.json()) as {
      status?: string
      results?: Array<{
        formatted_address?: string
        geometry?: {
          location?: {
            lat?: number
            lng?: number
          }
        }
      }>
      error_message?: string
    }

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      if (!result) {
        logger.error('Invalid result from geocoding API')
        return null
      }
      const location = result.geometry?.location

      // Validate coordinates
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        logger.error('Invalid coordinates from geocoding API:', location)
        return null
      }

      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: result.formatted_address || '',
      }
    } else if (data.status === 'ZERO_RESULTS') {
      logger.warn(`No results found for city: ${city}`)
      return null
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      logger.error('Google Geocoding API quota exceeded')
      return null
    } else {
      logger.error(`Geocoding error for ${city}:`, data.status, data.error_message)
      return null
    }
  } catch (error) {
    logger.error(`Failed to geocode ${city}:`, error)
    return null
  }
}

/**
 * Update record coordinates in database with PostGIS format
 * @param supabase Supabase client
 * @param tableName Table name
 * @param recordId Record ID
 * @param coordinates Coordinates to set
 * @returns Success status and error message if any
 */
export async function updateRecordCoordinates(
  supabase: SupabaseClient,
  tableName: string,
  recordId: string,
  coordinates: { latitude: number; longitude: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const postgisPoint = convertCoordinatesToPostGIS(coordinates)

    const { error } = await supabase
      .from(tableName)
      .update({ location_coordinates: postgisPoint })
      .eq('id', recordId)

    if (error) {
      logger.error(`Failed to update coordinates for ${tableName}.${recordId}:`, error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Error updating coordinates for ${tableName}.${recordId}:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Add a geocoding request to the queue
 * @param supabase Supabase client
 * @param tableName Table name
 * @param recordId Record ID
 * @param city City name to geocode
 * @returns Queue item ID or null if failed
 */
export async function queueGeocoding(
  supabase: SupabaseClient,
  tableName: string,
  recordId: string,
  city: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('geocoding_queue')
      .insert({
        table_name: tableName,
        record_id: recordId,
        city: city.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      logger.error(`Failed to queue geocoding for ${tableName}.${recordId}:`, error)
      return null
    }

    return data.id
  } catch (error) {
    logger.error(`Error queueing geocoding for ${tableName}.${recordId}:`, error)
    return null
  }
}

/**
 * Update queue item status
 * @param supabase Supabase client
 * @param queueItemId Queue item ID
 * @param status New status
 * @param errorMessage Error message if any
 * @returns Success status
 */
export async function updateQueueStatus(
  supabase: SupabaseClient,
  queueItemId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<boolean> {
  try {
    // For processing status, we need to increment attempt_count
    if (status === 'processing') {
      const { error } = await supabase.rpc('increment_geocoding_attempt_count', {
        queue_item_id: queueItemId,
        new_status: status,
        new_error_message: errorMessage || null,
      })

      if (error) {
        logger.error(`Failed to update queue status for ${queueItemId}:`, error)
        return false
      }
      return true
    }

    // For other statuses, update status but keep attempt_count unchanged
    const updateData: Record<string, unknown> = {
      status,
      last_attempt_at: new Date().toISOString(),
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    const { error } = await supabase
      .from('geocoding_queue')
      .update(updateData)
      .eq('id', queueItemId)

    if (error) {
      logger.error(`Failed to update queue status for ${queueItemId}:`, error)
      return false
    }

    return true
  } catch (error) {
    logger.error(`Error updating queue status for ${queueItemId}:`, error)
    return false
  }
}

/**
 * Get records that need geocoding from queue
 * @param supabase Supabase client
 * @param limit Maximum number of records to fetch
 * @returns Array of queue items
 */
export async function getPendingGeocodingRecords(
  supabase: SupabaseClient,
  limit: number = 50
): Promise<GeocodeQueueItem[]> {
  try {
    const now = new Date()
    const { data, error } = await supabase
      .from('geocoding_queue')
      .select('*')
      .or('status.eq.pending,status.eq.failed')
      .lt('attempt_count', 3) // Max 3 attempts
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      logger.error('Error fetching pending geocoding records:', error)
      return []
    }

    // Filter by backoff delay
    const eligibleRecords = (data || []).filter((item: GeocodeQueueItem) => {
      if (item.attempt_count === 0) return true
      if (!item.last_attempt_at) return true

      const lastAttempt = new Date(item.last_attempt_at)
      const delay = getBackoffDelay(item.attempt_count)
      const eligibleAt = new Date(lastAttempt.getTime() + delay)

      return now >= eligibleAt
    })

    return eligibleRecords
  } catch (error) {
    logger.error('Error processing pending geocoding records:', error)
    return []
  }
}

/**
 * Process a single geocoding queue item
 * @param supabase Supabase client
 * @param queueItem Queue item to process
 * @returns Success status
 */
export async function processGeocodeQueueItem(
  supabase: SupabaseClient,
  queueItem: GeocodeQueueItem
): Promise<{ success: boolean; error?: string }> {
  // Mark as processing
  await updateQueueStatus(supabase, queueItem.id, 'processing')

  // Geocode the city
  const geocoded = await geocodeCity(queueItem.city)

  if (geocoded) {
    // Update the record with coordinates
    const updateResult = await updateRecordCoordinates(
      supabase,
      queueItem.table_name,
      queueItem.record_id,
      geocoded
    )

    if (updateResult.success) {
      // Mark as completed
      await updateQueueStatus(supabase, queueItem.id, 'completed')
      logger.info(`✓ Geocoded ${queueItem.table_name}.${queueItem.record_id}: ${queueItem.city}`)
      return { success: true }
    } else {
      // Update failed with error
      await updateQueueStatus(
        supabase,
        queueItem.id,
        queueItem.attempt_count >= 2 ? 'failed' : 'pending',
        `Database update failed: ${updateResult.error}`
      )
      return { success: false, error: updateResult.error }
    }
  } else {
    // Geocoding failed
    const isFinalAttempt = queueItem.attempt_count >= 2
    const errorMsg = `Geocoding failed for "${queueItem.city}"`

    await updateQueueStatus(supabase, queueItem.id, isFinalAttempt ? 'failed' : 'pending', errorMsg)

    logger.warn(`✗ ${errorMsg} (attempt ${queueItem.attempt_count + 1}/3)`)
    return { success: false, error: errorMsg }
  }
}

/**
 * Process geocoding queue with rate limiting
 * @param supabase Supabase client
 * @param batchSize Number of records to process in this batch
 * @param delayBetweenRequests Delay in ms between API calls
 * @returns Statistics
 */
export async function processGeocodeQueue(
  supabase: SupabaseClient,
  batchSize: number = 50,
  delayBetweenRequests: number = 100
): Promise<{
  total: number
  successful: number
  failed: number
  rateLimited: number
}> {
  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    rateLimited: 0,
  }

  try {
    // Get pending records
    const queueItems = await getPendingGeocodingRecords(supabase, batchSize)
    stats.total = queueItems.length

    logger.info(`Processing ${stats.total} geocoding queue items...`)

    // Process each item with rate limiting
    for (const item of queueItems) {
      const result = await processGeocodeQueueItem(supabase, item)

      if (result.success) {
        stats.successful++
      } else {
        stats.failed++

        // Check if rate limited
        if (result.error?.includes('quota') || result.error?.includes('QUERY_LIMIT')) {
          stats.rateLimited++
          logger.warn('Rate limit detected, stopping batch processing')
          break
        }
      }

      // Rate limit delay
      if (delayBetweenRequests > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests))
      }
    }

    return stats
  } catch (error) {
    logger.error('Error processing geocoding queue:', error)
    return stats
  }
}

/**
 * Find records with NULL coordinates and queue them for geocoding
 * @param supabase Supabase client
 * @param tableName Table name
 * @param cityColumn Column name for city
 * @param batchSize Max records to queue per call
 * @returns Number of records queued
 */
export async function queueNullCoordinates(
  supabase: SupabaseClient,
  tableName: string,
  cityColumn: string = 'location_city',
  batchSize: number = 100
): Promise<number> {
  try {
    // Find records with city but no coordinates
    const { data: records, error } = await supabase
      .from(tableName)
      .select('id, location_city')
      .is('location_coordinates', null)
      .not(cityColumn, 'is', null)
      .limit(batchSize)

    if (error) {
      logger.error(`Error fetching records from ${tableName}:`, error)
      return 0
    }

    if (!records || records.length === 0) {
      return 0
    }

    // Queue each record for geocoding
    let queued = 0
    for (const record of records) {
      const recordWithIndex = record as {
        id: string
        location_city: string | null
        [key: string]: unknown
      }
      const city = (recordWithIndex.location_city || recordWithIndex[cityColumn]) as
        | string
        | null
        | undefined
      if (city) {
        const queueId = await queueGeocoding(supabase, tableName, recordWithIndex.id, city)
        if (queueId) queued++
      }
    }

    logger.info(`Queued ${queued} records from ${tableName} for geocoding`)
    return queued
  } catch (error) {
    logger.error(`Error queueing null coordinates for ${tableName}:`, error)
    return 0
  }
}

/**
 * Get geocoding statistics
 * @param supabase Supabase client
 * @returns Statistics object
 */
export async function getGeocodingStats(supabase: SupabaseClient): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
  byTable: Record<string, { pending: number; failed: number }>
}> {
  try {
    const { data: queue, error } = await supabase
      .from('geocoding_queue')
      .select('status, table_name')

    if (error) {
      logger.error('Error fetching geocoding stats:', error)
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        byTable: {},
      }
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byTable: {} as Record<string, { pending: number; failed: number }>,
    }

    for (const item of queue || []) {
      if (item.status === 'pending') stats.pending++
      else if (item.status === 'processing') stats.processing++
      else if (item.status === 'completed') stats.completed++
      else if (item.status === 'failed') stats.failed++

      // Count by table
      if (!stats.byTable[item.table_name]) {
        stats.byTable[item.table_name] = { pending: 0, failed: 0 }
      }
      const tableStats = stats.byTable[item.table_name]
      if (tableStats) {
        if (item.status === 'pending') tableStats.pending++
        if (item.status === 'failed') tableStats.failed++
      }
    }

    return stats
  } catch (error) {
    logger.error('Error calculating geocoding stats:', error)
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byTable: {},
    }
  }
}
