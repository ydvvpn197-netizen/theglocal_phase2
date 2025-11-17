/**
 * Google Maps Integration
 *
 * Wrapper for Google Maps JavaScript API
 *
 * Setup:
 * 1. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
 * 2. Enable Maps JavaScript API in Google Cloud Console
 * 3. Set up API key restrictions (HTTP referrers for theglocal.in)
 */

import { logger } from '@/lib/utils/logger'
import { createTrustedScriptURL } from '@/lib/security/trusted-types'

let googleMapsLoaded = false
let loadingPromise: Promise<typeof google.maps> | null = null

/**
 * Load Google Maps API
 * Returns google.maps object
 */
export async function loadGoogleMaps(): Promise<typeof google.maps> {
  // Return cached if already loaded
  if (googleMapsLoaded && typeof window !== 'undefined' && window.google?.maps) {
    return window.google.maps
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = new Promise((resolve, reject) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

      if (!apiKey) {
        reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'))
        return
      }

      // Check if script already exists
      if (typeof window !== 'undefined' && window.google?.maps) {
        googleMapsLoaded = true
        resolve(window.google.maps)
        return
      }

      // Load script
      const script = document.createElement('script')
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      const trustedScriptUrl = createTrustedScriptURL(scriptUrl)
      script.src =
        typeof trustedScriptUrl === 'string' ? trustedScriptUrl : trustedScriptUrl.toString()
      script.async = true
      script.defer = true

      script.onload = () => {
        googleMapsLoaded = true
        if (window.google?.maps) {
          resolve(window.google.maps)
        } else {
          reject(new Error('Google Maps failed to load'))
        }
      }

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'))
      }

      document.head.appendChild(script)
    } catch (error) {
      reject(error)
    }
  })

  return loadingPromise
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<{
  lat: number
  lng: number
  formatted_address: string
} | null> {
  try {
    const maps = await loadGoogleMaps()
    const geocoder = new maps.Geocoder()

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            formatted_address: results[0].formatted_address,
          })
        } else if (status === 'ZERO_RESULTS') {
          resolve(null)
        } else {
          reject(new Error(`Geocoding failed: ${status}`))
        }
      })
    })
  } catch (error) {
    logger.error('Geocode error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  formatted_address: string
  city: string | null
  state: string | null
  country: string | null
} | null> {
  try {
    const maps = await loadGoogleMaps()
    const geocoder = new maps.Geocoder()

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0]

          // Extract city, state, country from address components
          let city = null
          let state = null
          let country = null

          for (const component of result.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name
            } else if (component.types.includes('administrative_area_level_2') && !city) {
              city = component.long_name
            } else if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name
            } else if (component.types.includes('country')) {
              country = component.long_name
            }
          }

          resolve({
            formatted_address: result.formatted_address,
            city,
            state,
            country,
          })
        } else if (status === 'ZERO_RESULTS') {
          resolve(null)
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`))
        }
      })
    })
  } catch (error) {
    logger.error('Reverse geocode error:', error)
    return null
  }
}

/**
 * Create a map instance
 */
export async function createMap(
  element: HTMLElement,
  options: google.maps.MapOptions
): Promise<google.maps.Map> {
  const maps = await loadGoogleMaps()
  return new maps.Map(element, options)
}

/**
 * Create a marker
 */
export async function createMarker(
  options: google.maps.MarkerOptions
): Promise<google.maps.Marker> {
  const maps = await loadGoogleMaps()
  return new maps.Marker(options)
}

/**
 * Create an info window
 */
export async function createInfoWindow(
  options?: google.maps.InfoWindowOptions
): Promise<google.maps.InfoWindow> {
  const maps = await loadGoogleMaps()
  return new maps.InfoWindow(options)
}

/**
 * Create a circle overlay (for radius visualization)
 */
export async function createCircle(
  options: google.maps.CircleOptions
): Promise<google.maps.Circle> {
  const maps = await loadGoogleMaps()
  return new maps.Circle(options)
}

/**
 * Default map styles for a modern look
 */
export const DEFAULT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
]

/**
 * Get directions URL for Google Maps
 */
export function getDirectionsUrl(
  destination: { lat: number; lng: number } | string,
  origin?: { lat: number; lng: number } | string
): string {
  const baseUrl = 'https://www.google.com/maps/dir/'

  const formatLocation = (loc: { lat: number; lng: number } | string) => {
    if (typeof loc === 'string') return encodeURIComponent(loc)
    return `${loc.lat},${loc.lng}`
  }

  if (origin) {
    return `${baseUrl}${formatLocation(origin)}/${formatLocation(destination)}`
  }

  return `${baseUrl}/${formatLocation(destination)}`
}

/**
 * Calculate bounds for multiple markers
 */
export function calculateBounds(coordinates: Array<{ lat: number; lng: number }>): {
  north: number
  south: number
  east: number
  west: number
} {
  if (coordinates.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 }
  }

  const firstCoord = coordinates[0]
  if (!firstCoord) {
    return { north: 0, south: 0, east: 0, west: 0 }
  }

  let north = firstCoord.lat
  let south = firstCoord.lat
  let east = firstCoord.lng
  let west = firstCoord.lng

  for (const coord of coordinates) {
    if (coord.lat > north) north = coord.lat
    if (coord.lat < south) south = coord.lat
    if (coord.lng > east) east = coord.lng
    if (coord.lng < west) west = coord.lng
  }

  return { north, south, east, west }
}

/**
 * Marker colors for different types
 */
export const MARKER_COLORS = {
  event: '#FF6B6B', // Red
  artist: '#4ECDC4', // Teal
  community: '#95E1D3', // Light teal
  user: '#1A535C', // Dark teal
  primary: '#6366F1', // Indigo (brand color)
} as const

export type MarkerType = keyof typeof MARKER_COLORS
