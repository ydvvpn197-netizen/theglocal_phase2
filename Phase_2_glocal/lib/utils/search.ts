/**
 * Search Utilities
 * Provides fuzzy matching, relevance scoring, query parsing, and text highlighting
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1?.length || 0
  const len2 = str2?.length || 0
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = new Array<number>(len2 + 1).fill(0)
    matrix[i]![0] = i
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1?.[i - 1] === str2?.[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1, // deletion
        matrix[i]![j - 1]! + 1, // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      )
    }
  }

  return matrix[len1]?.[len2] || 0
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * 1 = identical, 0 = completely different
 */
export function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  return maxLength === 0 ? 1 : 1 - distance / maxLength
}

/**
 * Parse search query into terms
 * Handles quoted phrases and splits by spaces
 */
export function parseSearchQuery(query: string): string[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const terms: string[] = []
  const regex = /"([^"]+)"|(\S+)/g
  let match

  while ((match = regex.exec(trimmed)) !== null) {
    const term = match[1] || match[2]
    if (term) {
      terms.push(term.toLowerCase())
    }
  }

  return terms
}

/**
 * Check if text contains all search terms
 */
export function matchesAllTerms(text: string, terms: string[]): boolean {
  const lowerText = text.toLowerCase()
  return terms.every((term) => lowerText.includes(term))
}

/**
 * Calculate relevance score for a search result
 * Higher score = more relevant
 */
export interface RelevanceScoreOptions {
  text: string
  searchTerms: string[]
  isTitle?: boolean
  isDescription?: boolean
  distanceKm?: number
  createdAt?: string
  fuzzyThreshold?: number
}

export function calculateRelevanceScore(options: RelevanceScoreOptions): number {
  const {
    text,
    searchTerms,
    isTitle = false,
    isDescription = false,
    distanceKm,
    createdAt,
    fuzzyThreshold = 0.3,
  } = options

  let score = 0
  const lowerText = text.toLowerCase()

  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase()

    // Exact match in title/name (highest priority)
    if (isTitle && lowerText === lowerTerm) {
      score += 100
      continue
    }

    // Exact match in description
    if (isDescription && lowerText === lowerTerm) {
      score += 30
      continue
    }

    // Partial match in title/name (starts with or contains)
    if (isTitle) {
      if (lowerText.startsWith(lowerTerm)) {
        score += 60
      } else if (lowerText.includes(lowerTerm)) {
        score += 50
      } else {
        // Fuzzy match in title
        const similarity = stringSimilarity(lowerText, lowerTerm)
        if (similarity >= fuzzyThreshold) {
          score += 20 * similarity
        }
      }
      continue
    }

    // Partial match in description
    if (isDescription) {
      if (lowerText.includes(lowerTerm)) {
        score += 10
      } else {
        // Fuzzy match in description
        const similarity = stringSimilarity(lowerText, lowerTerm)
        if (similarity >= fuzzyThreshold) {
          score += 5 * similarity
        }
      }
    }
  }

  // Distance bonus (closer = better, max -50 points)
  if (distanceKm !== undefined && distanceKm > 0) {
    const distancePenalty = Math.min(distanceKm, 50)
    score -= distancePenalty
  }

  // Recency bonus (newer = better, max +30 points)
  if (createdAt) {
    const daysSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation <= 30) {
      const recencyBonus = Math.max(0, 30 - daysSinceCreation)
      score += recencyBonus
    }
  }

  return Math.max(0, score)
}

/**
 * Highlight search terms in text
 * Returns array of text segments with highlight markers
 */
export interface HighlightSegment {
  text: string
  highlighted: boolean
}

export function highlightSearchTerms(text: string, searchTerms: string[]): HighlightSegment[] {
  if (!text || searchTerms.length === 0) {
    return [{ text, highlighted: false }]
  }

  const segments: HighlightSegment[] = []
  const lowerText = text.toLowerCase()
  let lastIndex = 0
  const matches: Array<{ start: number; end: number }> = []

  // Find all matches
  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase()
    let index = lowerText.indexOf(lowerTerm, lastIndex)

    while (index !== -1) {
      matches.push({ start: index, end: index + term.length })
      index = lowerText.indexOf(lowerTerm, index + 1)
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start)

  // Merge overlapping matches
  const mergedMatches: Array<{ start: number; end: number }> = []
  for (const match of matches) {
    if (mergedMatches.length === 0) {
      mergedMatches.push(match)
    } else {
      const last = mergedMatches[mergedMatches.length - 1]!
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end)
      } else {
        mergedMatches.push(match)
      }
    }
  }

  // Build segments
  for (const match of mergedMatches) {
    // Add text before match
    if (match.start > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.start),
        highlighted: false,
      })
    }

    // Add highlighted match
    segments.push({
      text: text.substring(match.start, match.end),
      highlighted: true,
    })

    lastIndex = match.end
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      highlighted: false,
    })
  }

  return segments.length > 0 ? segments : [{ text, highlighted: false }]
}

/**
 * Normalize search query for caching
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s"]/g, '')
}

/**
 * Generate cache key for search
 */
export function generateSearchCacheKey(query: string, filters: Record<string, unknown>): string {
  const normalizedQuery = normalizeSearchQuery(query)
  const filtersHash = JSON.stringify(filters, Object.keys(filters).sort())
  return `search:${normalizedQuery}:${Buffer.from(filtersHash).toString('base64').slice(0, 16)}`
}

/**
 * Check if text matches search query (fuzzy)
 */
export function fuzzyMatch(text: string, query: string, threshold = 0.3): boolean {
  const terms = parseSearchQuery(query)
  if (terms.length === 0) return false

  const lowerText = text.toLowerCase()

  // Check if all terms match (exact or fuzzy)
  return terms.every((term) => {
    if (lowerText.includes(term)) return true

    // Try fuzzy matching on words
    const words = lowerText.split(/\s+/)
    return words.some((word) => stringSimilarity(word, term) >= threshold)
  })
}
