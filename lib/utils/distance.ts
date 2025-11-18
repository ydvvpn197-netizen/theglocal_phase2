/**
 * Distance Utility Functions
 * Helpers for formatting and working with distances in the platform
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Format distance in kilometers for display
 * Shows "Near you" for < 1km, meters for < 1km, km for >= 1km
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) {
    return ''
  }

  if (km < 0.1) {
    return 'Near you'
  }

  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }

  if (km < 10) {
    return `${km.toFixed(1)} km`
  }

  return `${Math.round(km)} km`
}

/**
 * Get color class based on distance
 * Useful for visual indicators of proximity
 */
export function getDistanceColor(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) {
    return 'text-muted-foreground'
  }

  if (km < 1) {
    return 'text-green-600 dark:text-green-400' // Very close
  }

  if (km < 5) {
    return 'text-blue-600 dark:text-blue-400' // Close
  }

  if (km < 25) {
    return 'text-yellow-600 dark:text-yellow-400' // Moderate
  }

  return 'text-orange-600 dark:text-orange-400' // Far
}

/**
 * Get distance badge variant based on proximity
 */
export function getDistanceBadgeVariant(
  km: number | null | undefined
): 'default' | 'secondary' | 'outline' {
  if (km === null || km === undefined || isNaN(km)) {
    return 'outline'
  }

  if (km < 1) {
    return 'default' // Highlight very close items
  }

  if (km < 10) {
    return 'secondary'
  }

  return 'outline'
}

/**
 * Sort array of items by distance
 * Handles null/undefined distances by placing them at the end
 */
export function sortByDistance<T extends { distance_km?: number | null }>(
  items: T[],
  ascending: boolean = true
): T[] {
  return [...items].sort((a, b) => {
    const distA = a?.distance_km ?? Infinity
    const distB = b?.distance_km ?? Infinity

    if (distA === Infinity && distB === Infinity) return 0
    if (distA === Infinity) return 1
    if (distB === Infinity) return -1

    return ascending ? distA - distB : distB - distA
  })
}

/**
 * Filter items within a specific radius
 */
export function filterByRadius<T extends { distance_km?: number | null }>(
  items: T[],
  maxRadiusKm: number
): T[] {
  return items?.filter((item) => {
    const distance = item?.distance_km
    return distance !== null && distance !== undefined && distance <= maxRadiusKm
  })
}

/**
 * Group items by distance ranges
 * Returns object with keys: 'nearby' (<5km), 'close' (5-25km), 'far' (>25km)
 */
export function groupByDistanceRanges<T extends { distance_km?: number | null }>(
  items: T[]
): {
  nearby: T[]
  close: T[]
  far: T[]
  unknown: T[]
} {
  const groups = {
    nearby: [] as T[],
    close: [] as T[],
    far: [] as T[],
    unknown: [] as T[],
  }

  items?.forEach((item) => {
    const distance = item?.distance_km

    if (distance === null || distance === undefined) {
      groups?.unknown.push(item)
    } else if (distance < 5) {
      groups?.nearby.push(item)
    } else if (distance < 25) {
      groups?.close.push(item)
    } else {
      groups?.far.push(item)
    }
  })

  return groups
}

/**
 * Get distance label for filtering/grouping
 */
export function getDistanceLabel(km: number | null | undefined): string {
  if (km === null || km === undefined) {
    return 'Unknown'
  }

  if (km < 1) {
    return 'Near you'
  }

  if (km < 5) {
    return 'Nearby'
  }

  if (km < 25) {
    return 'In your area'
  }

  return 'Farther away'
}

/**
 * Convert coordinates to PostGIS POINT format
 */
export function coordinatesToPostGIS(coords: Coordinates): string {
  return `POINT(${coords?.longitude} ${coords?.latitude})`
}

/**
 * Parse PostGIS POINT to coordinates object
 */
export function postGISToCoordinates(postgis: string | null | undefined): Coordinates | null {
  if (!postgis) return null

  try {
    const match = postgis?.match(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (!match || !match[1] || !match[2]) return null

    const longitude = parseFloat(match[1])
    const latitude = parseFloat(match[2])

    // Validate parsed coordinates
    if (
      isNaN(longitude) ||
      isNaN(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null
    }

    return {
      longitude,
      latitude,
    }
  } catch {
    return null
  }
}

/**
 * Calculate if a point is within a radius (client-side fallback)
 * Uses Haversine formula
 */
export function isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
  const R = 6371 // Earth's radius in km
  const dLat = toRadians(point?.latitude - center?.latitude)
  const dLon = toRadians(point?.longitude - center?.longitude)

  const a =
    Math?.sin(dLat / 2) * Math?.sin(dLat / 2) +
    Math?.cos(toRadians(center?.latitude)) *
      Math?.cos(toRadians(point?.latitude)) *
      Math?.sin(dLon / 2) *
      Math?.sin(dLon / 2)

  const c = 2 * Math?.atan2(Math?.sqrt(a), Math?.sqrt(1 - a))
  const distance = R * c

  return distance <= radiusKm
}

/**
 * Calculate distance between two points (client-side fallback)
 * Uses Haversine formula, returns distance in km
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRadians(point2?.latitude - point1?.latitude)
  const dLon = toRadians(point2?.longitude - point1?.longitude)

  const a =
    Math?.sin(dLat / 2) * Math?.sin(dLat / 2) +
    Math?.cos(toRadians(point1?.latitude)) *
      Math?.cos(toRadians(point2?.latitude)) *
      Math?.sin(dLon / 2) *
      Math?.sin(dLon / 2)

  const c = 2 * Math?.atan2(Math?.sqrt(a), Math?.sqrt(1 - a))
  const distance = R * c

  return Math?.round(distance * 10) / 10 // Round to 1 decimal
}

function toRadians(degrees: number): number {
  return degrees * (Math?.PI / 180)
}

/**
 * Get radius options for filters
 */
export const RADIUS_OPTIONS = [
  { value: 1, label: '1 km', description: 'Walking distance' },
  { value: 5, label: '5 km', description: 'Very close' },
  { value: 10, label: '10 km', description: 'Nearby' },
  { value: 25, label: '25 km', description: 'Local area' },
  { value: 50, label: '50 km', description: 'Extended area' },
  { value: 100, label: '100 km', description: 'City-wide' },
] as const

export type RadiusOption = (typeof RADIUS_OPTIONS)[number]
