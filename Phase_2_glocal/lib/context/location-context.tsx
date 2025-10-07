'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LocationContextType {
  userCity: string | null
  userCoordinates: { lat: number; lng: number } | null
  radius: number // in km
  setRadius: (radius: number) => void
  setUserCity: (city: string) => void
  setUserCoordinates: (coords: { lat: number; lng: number } | null) => void
  isLoading: boolean
  error: string | null
  requestLocation: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userCity, setUserCity] = useState<string | null>(null)
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState<number>(25) // Default 25km
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser')
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
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
        const data = await response.json()
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county ||
          'Unknown'
        setUserCity(city)
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError)
        // Continue without city name
      }
    } catch (err) {
      const errorMessage =
        err instanceof GeolocationPositionError
          ? err.code === 1
            ? 'Location permission denied'
            : err.code === 2
              ? 'Location unavailable'
              : 'Location request timeout'
          : 'Failed to get location'

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Load saved location from localStorage on mount
  useEffect(() => {
    const savedCity = localStorage.getItem('userCity')
    const savedCoords = localStorage.getItem('userCoordinates')
    const savedRadius = localStorage.getItem('locationRadius')

    if (savedCity) setUserCity(savedCity)
    if (savedCoords) setUserCoordinates(JSON.parse(savedCoords))
    if (savedRadius) setRadius(parseInt(savedRadius, 10))
  }, [])

  // Save location to localStorage when it changes
  useEffect(() => {
    if (userCity) {
      localStorage.setItem('userCity', userCity)
    }
  }, [userCity])

  useEffect(() => {
    if (userCoordinates) {
      localStorage.setItem('userCoordinates', JSON.stringify(userCoordinates))
    }
  }, [userCoordinates])

  useEffect(() => {
    localStorage.setItem('locationRadius', radius.toString())
  }, [radius])

  return (
    <LocationContext.Provider
      value={{
        userCity,
        userCoordinates,
        radius,
        setRadius,
        setUserCity,
        setUserCoordinates,
        isLoading,
        error,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
