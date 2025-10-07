/**
 * Location Utilities
 * Functions for handling geolocation, distance calculations, and privacy
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface LocationData {
  city: string
  coordinates: Coordinates
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First coordinate
 * @param point2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371 // Radius of Earth in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude)
  const dLon = toRadians(point2.longitude - point1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Round coordinates to city-level precision for privacy
 * Rounds to ~1km accuracy (0.01 degrees)
 * @param coordinates Original coordinates
 * @returns Rounded coordinates
 */
export function roundCoordinatesForPrivacy(coordinates: Coordinates): Coordinates {
  return {
    latitude: Math.round(coordinates.latitude * 100) / 100,
    longitude: Math.round(coordinates.longitude * 100) / 100,
  }
}

/**
 * Get user's current location using browser Geolocation API
 * @returns Promise with coordinates or null if denied
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by this browser')
    return null
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        console.error('Error getting location:', error.message)
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    )
  })
}

/**
 * Get city name from coordinates using reverse geocoding
 * Note: In production, you'd use a geocoding service (Google Maps, Mapbox, etc.)
 * This is a placeholder that returns a formatted string
 */
export async function getCityFromCoordinates(coordinates: Coordinates): Promise<string> {
  // TODO: Implement actual reverse geocoding when API is integrated
  // For now, return a formatted string
  return `${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}`
}

/**
 * Check if a point is within a radius of another point
 * @param center Center point
 * @param point Point to check
 * @param radiusKm Radius in kilometers
 * @returns boolean
 */
export function isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
  const distance = calculateDistance(center, point)
  return distance <= radiusKm
}

/**
 * Format distance for display
 * @param km Distance in kilometers
 * @returns Formatted string (e.g., "2.5 km" or "500 m")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

/**
 * Get location radius options for filtering
 */
export const LOCATION_RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 999999, label: 'City-wide' },
] as const
