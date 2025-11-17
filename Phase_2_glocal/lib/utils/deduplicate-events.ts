/**
 * Event Deduplication Utility
 *
 * Provides functions to detect and remove duplicate events based on
 * - Exact external_id match (for events from same source)
 * - Similar title + same date + same city (for events from different sources or without external_id)
 *
 * When duplicates are found, keeps the event with the most complete data.
 */

import { stringSimilarity } from './search'

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

/**
 * Calculate completeness score for an event (0-100)
 * Higher score = more complete data
 */
export function calculateCompleteness(event: Event): number {
  let score = 0

  // Has image (25 points)
  if (event?.image_url) {
    score += 25
  }

  // Has meaningful description (25 points)
  if (event?.description && event?.description.length > 50) {
    score += 25
  }

  // Has venue/location info (20 points)
  if (event?.venue || event?.location_address) {
    score += 20
  }

  // Has ticket/price info (15 points)
  if (event?.ticket_info || event?.price) {
    score += 15
  }

  // Has external booking URL (15 points)
  if (event?.external_booking_url) {
    score += 15
  }

  return score
}

/**
 * Check if two event dates are within 1 hour of each other
 */
function datesAreSimilar(date1: string, date2: string): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const hoursDiff = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60)
  return hoursDiff <= 1
}

/**
 * Check if two events are duplicates
 */
function areEventsDuplicate(event1: Event, event2: Event): boolean {
  // If both have external_id and they match, they're duplicates
  if (event1?.external_id && event2?.external_id && event1?.external_id === event2?.external_id) {
    return true
  }

  // Check if required fields exist
  if (
    !event1?.title ||
    !event2?.title ||
    !event1?.event_date ||
    !event2?.event_date ||
    !event1?.location_city ||
    !event2?.location_city
  ) {
    return false
  }

  // Otherwise, check for similar title, same date (within 1 hour), and same city
  const titleSimilarity = stringSimilarity(event1?.title, event2?.title)
  const sameDateRange = datesAreSimilar(event1?.event_date, event2?.event_date)
  const sameCity = event1?.location_city.toLowerCase() === event2?.location_city.toLowerCase()

  // Consider duplicate if title similarity > 85% and dates are close and same city
  return titleSimilarity > 0.85 && sameDateRange && sameCity
}

/**
 * Find duplicate groups in a list of events
 * Returns an array of arrays, where each inner array contains duplicate events
 */
export function findDuplicates(events: Event[]): Event[][] {
  const duplicateGroups: Event[][] = []
  const processed = new Set<string>()

  for (let i = 0; i < events.length; i++) {
    const currentEvent = events[i]
    if (!currentEvent?.id || processed.has(currentEvent.id)) {
      continue
    }

    const duplicates: Event[] = [currentEvent]
    processed.add(currentEvent.id)

    for (let j = i + 1; j < events.length; j++) {
      const otherEvent = events[j]
      if (!otherEvent?.id || processed.has(otherEvent.id)) {
        continue
      }

      if (areEventsDuplicate(currentEvent, otherEvent)) {
        duplicates.push(otherEvent)
        processed.add(otherEvent.id)
      }
    }

    // Only add to duplicate groups if there are actually duplicates
    if (duplicates.length > 1) {
      duplicateGroups.push(duplicates)
    }
  }

  return duplicateGroups
}

/**
 * Select the best event from a group of duplicates
 * Returns the event with the highest completeness score
 */
export function selectBestEvent(duplicates: Event[]): Event {
  if (duplicates.length === 0) {
    throw new Error('Cannot select best event from empty array')
  }

  if (duplicates.length === 1) {
    return duplicates[0]!
  }

  // Calculate completeness score for each event
  const eventsWithScores = duplicates.map((event) => ({
    event,
    score: calculateCompleteness(event),
  }))

  // Sort by score descending
  eventsWithScores.sort((a, b) => b.score - a.score)

  // Return the event with the highest score
  return eventsWithScores[0]!.event
}

/**
 * Get events to delete from duplicate groups
 * Returns an array of event IDs that should be deleted
 */
export function getEventsToDelete(duplicateGroups: Event[][]): string[] {
  const idsToDelete: string[] = []

  for (const group of duplicateGroups) {
    const bestEvent = selectBestEvent(group)

    // Add all other event IDs to delete list
    for (const event of group) {
      if (event.id !== bestEvent.id) {
        idsToDelete.push(event.id)
      }
    }
  }

  return idsToDelete
}
