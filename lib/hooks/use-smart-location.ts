/**
 * Smart Location Hook
 *
 * Progressive location detection with multiple fallbacks:
 * 1. Check localStorage (instant)
 * 2. Check user profile in database (if authenticated)
 * 3. Request browser geolocation (requires permission)
 * 4. Fallback to IP-based geolocation (ipapi.co)
 * 5. Ultimate fallback to default location
 *
 * Usage: Call once on app initialization
 */

import { logger } from '@/lib/utils/logger'
import { useEffect, useState } from 'react'
import { useLocation } from '@/lib/context/location-context'
import { useAuth } from '@/lib/context/auth-context'

interface SmartLocationResult {
  isDetecting: boolean
  source: 'localStorage' | 'database' | 'browser' | 'ip' | 'default' | null
  error: string | null
}

export function useSmartLocation(): SmartLocationResult {
  const { setUserCity, setUserCoordinates, userCity, userCoordinates } = useLocation()
  const { user, profile } = useAuth()

  const [isDetecting, setIsDetecting] = useState(false)
  const [source, setSource] = useState<SmartLocationResult['source']>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userCity && userCoordinates) {
      // Already have location, don't re-detect
      return
    }

    const detectLocation = async () => {
      setIsDetecting(true)
      setError(null)

      try {
        // Step 1: Check localStorage
        const savedCity = localStorage.getItem('userCity')
        const savedCoords = localStorage.getItem('userCoordinates')

        if (savedCity && savedCoords) {
          setUserCity(savedCity)
          setUserCoordinates(JSON.parse(savedCoords))
          setSource('localStorage')
          setIsDetecting(false)
          return
        }

        // Step 2: Check user profile in database (if authenticated)
        if (user && profile?.location_city) {
          setUserCity(profile.location_city)

          if (profile.location_coordinates && typeof profile.location_coordinates === 'string') {
            // Parse PostGIS POINT format with validation
            const match = profile.location_coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/)
            if (match && match[1] && match[2]) {
              const lng = parseFloat(match[1])
              const lat = parseFloat(match[2])

              // Validate coordinate bounds
              if (
                !isNaN(lng) &&
                !isNaN(lat) &&
                lat >= -90 &&
                lat <= 90 &&
                lng >= -180 &&
                lng <= 180
              ) {
                setUserCoordinates({ lat, lng })
              } else {
                logger.warn('Invalid coordinates from database:', { lng, lat })
              }
            }
          }

          setSource('database')
          setIsDetecting(false)
          return
        }

        // Step 3: Request browser geolocation
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 300000, // 5 minutes cache
              })
            })

            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }

            setUserCoordinates(coords)

            // Reverse geocode to get city name
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
              )
              const data = (await response.json()) as {
                address?: {
                  city?: string
                  town?: string
                  village?: string
                  county?: string
                }
              }
              const city =
                data.address?.city ||
                data.address?.town ||
                data.address?.village ||
                data.address?.county ||
                'Unknown'
              setUserCity(city)
            } catch {
              // Continue without city name
              setUserCity('Unknown')
            }

            setSource('browser')
            setIsDetecting(false)
            return
          } catch {
            logger.info('Browser geolocation failed, trying IP-based...')
          }
        }

        // Step 4: Fallback to IP-based geolocation
        try {
          const ipResponse = await fetch('https://ipapi.co/json/')
          const ipData = (await ipResponse.json()) as {
            city?: string
            latitude?: number
            longitude?: number
          }

          if (ipData.city && ipData.latitude && ipData.longitude) {
            setUserCity(ipData.city)
            setUserCoordinates({
              lat: ipData.latitude,
              lng: ipData.longitude,
            })
            setSource('ip')
            setIsDetecting(false)
            return
          }
        } catch {
          logger.info('IP-based geolocation failed')
        }

        // Step 5: Ultimate fallback - default location
        setUserCity('Mumbai') // India's largest city
        setSource('default')
        setIsDetecting(false)
      } catch (err) {
        logger.error('Smart location detection error:', err)
        setError(err instanceof Error ? err.message : 'Failed to detect location')

        // Set default location
        setUserCity('Mumbai')
        setSource('default')
        setIsDetecting(false)
      }
    }

    detectLocation()
  }, [user, profile, userCity, userCoordinates, setUserCity, setUserCoordinates])

  return {
    isDetecting,
    source,
    error,
  }
}
