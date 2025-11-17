'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useRef, useState } from 'react'
import {
  createMap,
  createCircle,
  DEFAULT_MAP_STYLES,
  loadGoogleMaps,
} from '@/lib/integrations/google-maps'
import { MapMarker } from './map-marker'
import { useLocation } from '@/lib/context/location-context'
import { Button } from '@/components/ui/button'
import { MapPin, Locate } from 'lucide-react'

interface Event {
  id: string
  title: string
  venue?: string
  city: string
  event_date: string
  category: string
  distance_km?: number
  // Coordinates
  latitude?: number
  longitude?: number
}

interface EventMapProps {
  events: Event[]
  onEventClick?: (event: Event) => void
  height?: string
  showUserLocation?: boolean
  showRadius?: boolean
}

/**
 * Event Map Component
 *
 * Displays events on Google Maps with clustering and user location
 */
export function EventMap({
  events,
  onEventClick,
  height = '600px',
  showUserLocation = true,
  showRadius = true,
}: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [radiusCircle, setRadiusCircle] = useState<google.maps.Circle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { userCoordinates, radius } = useLocation()

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return

      try {
        setIsLoading(true)
        await loadGoogleMaps()

        const defaultCenter = userCoordinates || { lat: 19.076, lng: 72.8777 } // Mumbai

        const newMap = await createMap(mapRef.current, {
          center: defaultCenter,
          zoom: 12,
          styles: DEFAULT_MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        setMap(newMap)
        setIsLoading(false)
      } catch (err) {
        logger.error('Failed to initialize map:', err)
        setError('Failed to load map. Please check your internet connection.')
        setIsLoading(false)
      }
    }

    initMap()
  }, [userCoordinates])

  // Show radius circle around user location
  useEffect(() => {
    if (!map || !userCoordinates || !showRadius) return

    const initCircle = async () => {
      // Remove existing circle
      if (radiusCircle) {
        radiusCircle.setMap(null)
      }

      const circle = await createCircle({
        map,
        center: userCoordinates,
        radius: radius * 1000, // Convert km to meters
        fillColor: '#6366F1',
        fillOpacity: 0.1,
        strokeColor: '#6366F1',
        strokeOpacity: 0.3,
        strokeWeight: 2,
      })

      setRadiusCircle(circle)
    }

    initCircle()

    return () => {
      if (radiusCircle) {
        radiusCircle.setMap(null)
      }
    }
  }, [map, userCoordinates, radius, showRadius, radiusCircle])

  // Fit bounds to show all events
  useEffect(() => {
    if (!map || events.length === 0) return

    const bounds = new google.maps.LatLngBounds()

    // Add user location to bounds
    if (userCoordinates) {
      bounds.extend(userCoordinates)
    }

    // Add event locations to bounds
    events.forEach((event) => {
      if (event.latitude && event.longitude) {
        bounds.extend({ lat: event.latitude, lng: event.longitude })
      }
    })

    map.fitBounds(bounds)

    // Add padding
    const padding = { top: 50, right: 50, bottom: 50, left: 50 }
    map.fitBounds(bounds, padding)
  }, [map, events, userCoordinates])

  // Center map on user location
  const centerOnUser = () => {
    if (map && userCoordinates) {
      map.setCenter(userCoordinates)
      map.setZoom(13)
    }
  }

  if (isLoading) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-muted rounded-lg border border-destructive/50"
      >
        <div className="text-center px-4">
          <MapPin className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-semibold mb-2">Map Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {userCoordinates && (
          <Button size="sm" variant="secondary" onClick={centerOnUser} className="shadow-lg">
            <Locate className="w-4 h-4 mr-2" />
            Center on Me
          </Button>
        )}
      </div>

      {/* Event markers */}
      {map &&
        events.map((event) => {
          if (!event.latitude || !event.longitude) return null

          return (
            <MapMarker
              key={event.id}
              map={map}
              position={{ lat: event.latitude, lng: event.longitude }}
              title={event.title}
              type="event"
              content={`
              <div class="p-2">
                <h3 class="font-semibold text-sm">${event.title}</h3>
                <p class="text-xs text-gray-600 mt-1">${event.venue || event.city}</p>
                <p class="text-xs text-gray-500">${new Date(event.event_date).toLocaleDateString()}</p>
                ${event.distance_km ? `<p class="text-xs text-blue-600 mt-1">${event.distance_km} km away</p>` : ''}
              </div>
            `}
              onClick={() => onEventClick?.(event)}
            />
          )
        })}

      {/* User location marker */}
      {map && userCoordinates && showUserLocation && (
        <MapMarker
          map={map}
          position={userCoordinates}
          title="Your Location"
          type="user"
          content="<div class='p-2'><strong>Your Location</strong></div>"
        />
      )}
    </div>
  )
}
