/**
 * Category mapping utilities for artist filtering
 * Maps between display labels (ARTIST_CATEGORIES) and database IDs (SERVICE_CATEGORIES)
 */

import { ARTIST_CATEGORIES } from './constants'
import { SERVICE_CATEGORIES } from '@/lib/data/service-categories'

/**
 * Maps display label to database ID
 * e.g., "Musician" -> "musician", "Makeup Artist" -> "makeup_artist"
 */
const DISPLAY_TO_ID_MAP: Record<string, string> = {}

// Build the mapping from SERVICE_CATEGORIES
SERVICE_CATEGORIES.forEach((category) => {
  DISPLAY_TO_ID_MAP[category.label] = category.id
})

// Handle special cases for ARTIST_CATEGORIES that might not match exactly
DISPLAY_TO_ID_MAP['Musician'] = 'musician'
DISPLAY_TO_ID_MAP['DJ'] = 'dj'
DISPLAY_TO_ID_MAP['Photographer'] = 'photographer'
DISPLAY_TO_ID_MAP['Videographer'] = 'videographer'
DISPLAY_TO_ID_MAP['Makeup Artist'] = 'makeup_artist'
DISPLAY_TO_ID_MAP['Dancer'] = 'dancer'
DISPLAY_TO_ID_MAP['Comedian'] = 'comedian'
DISPLAY_TO_ID_MAP['Chef'] = 'chef'
DISPLAY_TO_ID_MAP['Artist'] = 'artist'
DISPLAY_TO_ID_MAP['Other'] = 'other'

/**
 * Maps database ID to display label
 * e.g., "musician" -> "Musician", "makeup_artist" -> "Makeup Artist"
 */
const ID_TO_DISPLAY_MAP: Record<string, string> = {}

SERVICE_CATEGORIES.forEach((category) => {
  ID_TO_DISPLAY_MAP[category.id] = category.label
})

/**
 * Converts a display label to its corresponding database ID
 * @param displayLabel - The display label (e.g., "Musician", "Makeup Artist")
 * @returns The database ID (e.g., "musician", "makeup_artist") or the original value if not found
 */
export function displayLabelToId(displayLabel: string): string {
  if (!displayLabel || displayLabel === 'all') {
    return 'all'
  }
  return DISPLAY_TO_ID_MAP[displayLabel] || displayLabel.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Converts a database ID to its corresponding display label
 * @param id - The database ID (e.g., "musician", "makeup_artist")
 * @returns The display label (e.g., "Musician", "Makeup Artist") or the original value if not found
 */
export function idToDisplayLabel(id: string): string {
  if (!id || id === 'all') {
    return 'all'
  }
  return ID_TO_DISPLAY_MAP[id] || id
}

/**
 * Normalizes a category value for filtering
 * Handles both display labels and database IDs, and extracts base category from subcategories
 * @param category - Category value (can be display label, ID, or "category:subcategory" format)
 * @returns Normalized category ID for filtering
 */
export function normalizeCategoryForFiltering(category: string | null | undefined): string | null {
  if (!category || category === 'all') {
    return null
  }

  // If it's already in "category:subcategory" format, extract the base category
  if (category.includes(':')) {
    const baseCategory = category.split(':')[0]
    if (baseCategory) {
      return baseCategory.toLowerCase()
    }
  }

  // Try to convert display label to ID
  const id = displayLabelToId(category)

  // If conversion didn't change the value (not found in map), try lowercase with underscores
  if (id === category) {
    return category.toLowerCase().replace(/\s+/g, '_')
  }

  return id
}

/**
 * Checks if a database category value matches a filter category
 * Handles exact matches and subcategory matches (e.g., "musician:Instrumentalist" matches "musician")
 * @param dbCategory - Category value from database (e.g., "musician", "musician:Instrumentalist")
 * @param filterCategory - Category to filter by (normalized ID, e.g., "musician")
 * @returns true if the database category matches the filter
 */
export function categoryMatches(dbCategory: string | null, filterCategory: string | null): boolean {
  if (!filterCategory || filterCategory === 'all') {
    return true
  }

  if (!dbCategory) {
    return false
  }

  const normalizedFilter = normalizeCategoryForFiltering(filterCategory)
  if (!normalizedFilter) {
    return true
  }

  // Normalize database category (extract base category if it has subcategory)
  const dbCategoryBase = dbCategory.includes(':')
    ? (dbCategory.split(':')[0] || dbCategory).toLowerCase()
    : dbCategory.toLowerCase()

  // Case-insensitive comparison
  return dbCategoryBase === normalizedFilter
}

/**
 * Gets all valid category IDs for filtering
 * @returns Array of category IDs
 */
export function getAllCategoryIds(): string[] {
  return SERVICE_CATEGORIES.map((cat) => cat.id)
}

/**
 * Gets all display labels for filtering
 * @returns Array of display labels
 */
export function getAllDisplayLabels(): string[] {
  return ARTIST_CATEGORIES.slice()
}
