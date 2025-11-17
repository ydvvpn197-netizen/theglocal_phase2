'use client'

import { logger } from '@/lib/utils/logger'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SavedLocation {
  id: string
  location_name: string
  location_city: string
  coordinates?: { lat: number; lng: number }
  is_primary: boolean
  created_at?: string
  updated_at?: string
}

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
  savedLocations: SavedLocation[]
  switchToLocation: (location: SavedLocation) => void
  addSavedLocation: (
    name: string,
    city: string,
    coordinates: { lat: number; lng: number },
    isPrimary: boolean
  ) => Promise<void>
  removeSavedLocation: (id: string) => Promise<void>
  setPrimaryLocation: (id: string) => Promise<void>
  isLoadingSavedLocations: boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userCity, setUserCity] = useState<string | null>(null)
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState<number>(25) // Default 25km
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [isLoadingSavedLocations, setIsLoadingSavedLocations] = useState(false)

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
        logger.error('Geocoding error:', geocodeError)
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

  // Load saved locations from API on mount
  useEffect(() => {
    const loadSavedLocations = async () => {
      setIsLoadingSavedLocations(true)
      try {
        const response = await fetch('/api/locations/saved')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setSavedLocations(result.data)
            // Set primary location if available
            const primaryLocation = result.data.find((loc: SavedLocation) => loc.is_primary)
            if (primaryLocation && primaryLocation.coordinates) {
              setUserCity(primaryLocation.location_city)
              setUserCoordinates(primaryLocation.coordinates)
            }
          }
        }
      } catch (error) {
        logger.error('Failed to load saved locations:', error)
      } finally {
        setIsLoadingSavedLocations(false)
      }
    }

    loadSavedLocations()

    // Also load from localStorage for backward compatibility
    const savedCity = localStorage.getItem('userCity')
    const savedCoords = localStorage.getItem('userCoordinates')
    const savedRadius = localStorage.getItem('locationRadius')

    if (savedCity && !userCity) setUserCity(savedCity)
    if (savedCoords && !userCoordinates) setUserCoordinates(JSON.parse(savedCoords))
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

  const switchToLocation = async (location: SavedLocation) => {
    setUserCity(location.location_city)
    if (location.coordinates) {
      setUserCoordinates(location.coordinates)
    }
    // Optionally set as primary location
    if (!location.is_primary) {
      await setPrimaryLocation(location.id)
    }
  }

  const addSavedLocation = async (
    name: string,
    city: string,
    coordinates: { lat: number; lng: number },
    isPrimary: boolean
  ) => {
    try {
      const response = await fetch('/api/locations/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_name: name,
          location_city: city,
          coordinates,
          is_primary: isPrimary,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save location')
      }

      const result = await response.json()
      if (result.success && result.data) {
        const newLocation = result.data
        setSavedLocations((prev) => {
          if (isPrimary) {
            // Set all others to non-primary
            return prev.map((loc) => ({ ...loc, is_primary: false })).concat(newLocation)
          }
          return [...prev, newLocation]
        })

        // If this is primary, update current location
        if (isPrimary && newLocation.coordinates) {
          setUserCity(newLocation.location_city)
          setUserCoordinates(newLocation.coordinates)
        }
      }
    } catch (error) {
      logger.error('Failed to add saved location:', error)
      throw error
    }
  }

  const removeSavedLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/saved?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete location')
      }

      setSavedLocations((prev) => prev.filter((loc) => loc.id !== id))
    } catch (error) {
      logger.error('Failed to remove saved location:', error)
      throw error
    }
  }

  const setPrimaryLocation = async (id: string) => {
    try {
      const response = await fetch('/api/locations/saved', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          is_primary: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set primary location')
      }

      const result = await response.json()
      if (result.success && result.data) {
        const updatedLocation = result.data
        setSavedLocations((prev) =>
          prev.map((loc) => ({
            ...loc,
            is_primary: loc.id === id,
          }))
        )

        // Update current location to primary
        if (updatedLocation.coordinates) {
          setUserCity(updatedLocation.location_city)
          setUserCoordinates(updatedLocation.coordinates)
        }
      }
    } catch (error) {
      logger.error('Failed to set primary location:', error)
      throw error
    }
  }

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
        savedLocations,
        switchToLocation,
        addSavedLocation,
        removeSavedLocation,
        setPrimaryLocation,
        isLoadingSavedLocations,
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
