/**
 * AI Event Processor
 *
 * Uses OpenAI GPT-4 to:
 * 1. Enhance event descriptions
 * 2. Categorize events intelligently
 * 3. Deduplicate events from different sources
 * 4. Extract structured metadata
 * 5. Generate SEO-friendly slugs
 */

import { logger } from '@/lib/utils/logger'
import { StandardizedEvent } from '@/lib/integrations/event-sources/types'

const OPENAI_API_BASE = 'https://api.openai.com/v1'

interface AIProcessorConfig {
  apiKey: string
  model?: string
  enableEnhancement?: boolean
  enableDeduplication?: boolean
}

interface ProcessedEvent extends StandardizedEvent {
  ai_enhanced: boolean
  slug?: string
  enhanced_description?: string
  ai_category?: string
}

interface DeduplicationResult {
  uniqueEvents: ProcessedEvent[]
  duplicateGroups: Array<{
    primary: ProcessedEvent
    duplicates: ProcessedEvent[]
  }>
}

/**
 * Process events with AI enhancement
 */
export async function processEventsWithAI(
  events: StandardizedEvent[],
  config?: Partial<AIProcessorConfig>
): Promise<ProcessedEvent[]> {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    logger.warn('OpenAI API key not configured. Skipping AI processing.')
    return events.map((e) => ({ ...e, ai_enhanced: false }))
  }

  const fullConfig: AIProcessorConfig = {
    apiKey,
    model: config?.model || 'gpt-4o-mini',
    enableEnhancement: config?.enableEnhancement !== false,
    enableDeduplication: config?.enableDeduplication !== false,
  }

  try {
    // Step 1: Enhance individual events
    let processedEvents: ProcessedEvent[] = events.map((e) => ({ ...e, ai_enhanced: false }))

    if (fullConfig.enableEnhancement) {
      logger.info('Enhancing events with AI...')
      processedEvents = await enhanceEventsBatch(events, fullConfig)
    }

    // Step 2: Deduplicate events
    if (fullConfig.enableDeduplication && processedEvents.length > 1) {
      logger.info('Deduplicating events with AI...')
      const dedupResult = await deduplicateEvents(processedEvents, fullConfig)
      processedEvents = dedupResult.uniqueEvents

      if (dedupResult.duplicateGroups.length > 0) {
        logger.info(`Found ${dedupResult.duplicateGroups.length} duplicate groups`)
      }
    }

    return processedEvents
  } catch (error) {
    logger.error('AI processing error:', error)
    return events.map((e) => ({ ...e, ai_enhanced: false }))
  }
}

/**
 * Enhance events in batch (more efficient)
 */
async function enhanceEventsBatch(
  events: StandardizedEvent[],
  config: AIProcessorConfig
): Promise<ProcessedEvent[]> {
  // Process in batches of 5 to avoid token limits
  const batchSize = 5
  const processedEvents: ProcessedEvent[] = []

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize)

    const prompt = `You are an event content enhancer. For each event below, provide:
1. An enhanced, SEO-friendly description (2-3 sentences)
2. A better category classification
3. A URL-friendly slug

Events to enhance:
${batch
  .map(
    (e, idx) => `
Event ${idx + 1}:
Title: ${e.title}
Description: ${e.description}
Category: ${e.category}
Venue: ${e.venue}
City: ${e.city}
`
  )
  .join('\n')}

Respond in JSON format:
{
  "events": [
    {
      "index": 0,
      "enhanced_description": "...",
      "ai_category": "...",
      "slug": "..."
    }
  ]
}`

    try {
      const response = await callOpenAI(prompt, config)
      const result = JSON.parse(response)

      batch.forEach((event, idx) => {
        const enhancement = Array.isArray(result.events)
          ? result.events.find((e: unknown) => {
              if (e && typeof e === 'object' && 'index' in e) {
                return (e as { index: number }).index === idx
              }
              return false
            })
          : undefined

        processedEvents.push({
          ...event,
          ai_enhanced: true,
          enhanced_description: enhancement?.enhanced_description || event.description,
          ai_category: enhancement?.ai_category || event.category,
          slug: enhancement?.slug || generateSlug(event.title),
        })
      })
    } catch (error) {
      logger.error('Batch enhancement error:', error)
      // Fallback: add events without enhancement
      batch.forEach((event) => {
        processedEvents.push({
          ...event,
          ai_enhanced: false,
          slug: generateSlug(event.title),
        })
      })
    }
  }

  return processedEvents
}

/**
 * Deduplicate events using AI
 */
async function deduplicateEvents(
  events: ProcessedEvent[],
  config: AIProcessorConfig
): Promise<DeduplicationResult> {
  // Create event summaries for comparison
  const eventSummaries = events.map((e, idx) => ({
    index: idx,
    title: e.title,
    venue: e.venue,
    city: e.city,
    date: new Date(e.event_date).toLocaleDateString(),
    source: e.source_platform,
  }))

  const prompt = `You are an event deduplication system. Analyze these events and identify which ones are duplicates (same event from different sources).

Events:
${JSON.stringify(eventSummaries, null, 2)}

Rules for identifying duplicates:
- Same or very similar title
- Same venue or very close venues
- Same city
- Same date
- Different sources are OK (they indicate the same event listed on multiple platforms)

Respond in JSON format with duplicate groups:
{
  "duplicateGroups": [
    {
      "primaryIndex": 0,
      "duplicateIndices": [3, 7]
    }
  ]
}

If no duplicates found, return empty array.`

  try {
    const response = await callOpenAI(prompt, config)
    const result = JSON.parse(response)

    const uniqueEvents: ProcessedEvent[] = []
    const duplicateGroups: Array<{
      primary: ProcessedEvent
      duplicates: ProcessedEvent[]
    }> = []
    const processedIndices = new Set<number>()

    // Process duplicate groups
    if (Array.isArray(result.duplicateGroups)) {
      result.duplicateGroups.forEach((group: unknown) => {
        if (!group || typeof group !== 'object') return
        const groupRecord = group as { primaryIndex?: number; duplicateIndices?: number[] }
        const primaryIndex = groupRecord.primaryIndex ?? -1
        const primary =
          primaryIndex >= 0 && primaryIndex < events.length ? events[primaryIndex] : undefined
        const duplicates = (groupRecord.duplicateIndices ?? [])
          .map((idx: number) => (idx >= 0 && idx < events.length ? events[idx] : undefined))
          .filter((e): e is ProcessedEvent => e !== undefined)

        if (primary && duplicates.length > 0) {
          // Merge information from duplicates into primary
          const mergedEvent = mergeDuplicateEvents(primary, duplicates)
          uniqueEvents.push(mergedEvent)

          duplicateGroups.push({
            primary: mergedEvent,
            duplicates,
          })

          if (groupRecord.primaryIndex !== undefined) {
            processedIndices.add(groupRecord.primaryIndex)
          }
          groupRecord.duplicateIndices?.forEach((idx: number) => processedIndices.add(idx))
        }
      })
    }

    // Add non-duplicate events
    events.forEach((event, idx) => {
      if (!processedIndices.has(idx)) {
        uniqueEvents.push(event)
      }
    })

    return {
      uniqueEvents,
      duplicateGroups,
    }
  } catch (error) {
    logger.error('Deduplication error:', error)
    // Return all events as unique if deduplication fails
    return {
      uniqueEvents: events,
      duplicateGroups: [],
    }
  }
}

/**
 * Merge duplicate events into a single enhanced event
 */
function mergeDuplicateEvents(
  primary: ProcessedEvent,
  duplicates: ProcessedEvent[]
): ProcessedEvent {
  // Prefer the best quality image
  const allEvents = [primary, ...duplicates]
  const bestImage = allEvents.find(
    (e) => e.image_url && !e.image_url.includes('placehold')
  )?.image_url

  // Combine ticket URLs from all sources
  const ticketUrls = allEvents.map((e) => e.ticket_url).filter(Boolean)

  // Use the most detailed description
  const bestDescription = allEvents.reduce((best, current) => {
    return current.description.length > best.description.length ? current : best
  }, primary).description

  return {
    ...primary,
    image_url: bestImage || primary.image_url,
    description: bestDescription,
    enhanced_description: primary.enhanced_description || bestDescription,
    raw_data: {
      ...primary.raw_data,
      duplicate_sources: duplicates.map((d) => d.source_platform),
      all_ticket_urls: ticketUrls,
    },
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, config: AIProcessorConfig): Promise<string> {
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert event content processor. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Generate URL-friendly slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/**
 * Categorize single event with AI
 */
export async function categorizeEvent(event: StandardizedEvent): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return event.category
  }

  try {
    const prompt = `Categorize this event into ONE of these categories: movie, play, concert, sports, comedy, workshop, food, nightlife, conference, exhibition, networking, meetup, other.

Event:
Title: ${event.title}
Description: ${event.description}
Current Category: ${event.category}

Respond with just the category name.`

    const response = await callOpenAI(prompt, { apiKey, model: 'gpt-4o-mini' })
    const result = JSON.parse(response)
    return result.category || event.category
  } catch {
    return event.category
  }
}

/**
 * Extract metadata from unstructured text
 */
export async function extractEventMetadata(text: string): Promise<{
  venue?: string
  date?: string
  price?: string
  category?: string
}> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return {}
  }

  try {
    const prompt = `Extract event metadata from this text:

"${text}"

Respond in JSON format:
{
  "venue": "...",
  "date": "...",
  "price": "...",
  "category": "..."
}

If any field is not found, omit it.`

    const response = await callOpenAI(prompt, { apiKey, model: 'gpt-4o-mini' })
    return JSON.parse(response)
  } catch {
    return {}
  }
}
