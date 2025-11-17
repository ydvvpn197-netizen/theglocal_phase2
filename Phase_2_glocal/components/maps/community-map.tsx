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
import { Locate } from 'lucide-react'

interface Community {
  id: string
  name: string
  slug: string
  location_city: string
  member_count: number
  distance_km?: number
  is_member?: boolean
  // Coordinates
  latitude?: number
  longitude?: number
}

interface CommunityMapProps {
  communities: Community[]
  onCommunityClick?: (community: Community) => void
  height?: string
  showUserLocation?: boolean
  showRadius?: boolean
}

/**
 * Community Map Component
 *
 * Displays communities on Google Maps with user location
 */
export function CommunityMap({
  communities,
  onCommunityClick,
  height = '600px',
  showUserLocation = true,
  showRadius = true,
}: CommunityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [radiusCircle, setRadiusCircle] = useState<google.maps.Circle | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { userCoordinates, radius } = useLocation()

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return

      try {
        setIsLoading(true)
        await loadGoogleMaps()

        const defaultCenter = userCoordinates || { lat: 19.076, lng: 72.8777 }

        const newMap = await createMap(mapRef.current, {
          center: defaultCenter,
          zoom: 11,
          styles: DEFAULT_MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        setMap(newMap)
        setIsLoading(false)
      } catch (err) {
        logger.error('Failed to initialize map:', err)
        setIsLoading(false)
      }
    }

    initMap()
  }, [userCoordinates])

  // Show radius circle
  useEffect(() => {
    if (!map || !userCoordinates || !showRadius) return

    const initCircle = async () => {
      if (radiusCircle) {
        radiusCircle.setMap(null)
      }

      const circle = await createCircle({
        map,
        center: userCoordinates,
        radius: radius * 1000,
        fillColor: '#95E1D3',
        fillOpacity: 0.1,
        strokeColor: '#95E1D3',
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

  // Fit bounds
  useEffect(() => {
    if (!map || communities.length === 0) return

    const bounds = new google.maps.LatLngBounds()

    if (userCoordinates) {
      bounds.extend(userCoordinates)
    }

    communities.forEach((community) => {
      if (community.latitude && community.longitude) {
        bounds.extend({ lat: community.latitude, lng: community.longitude })
      }
    })

    map.fitBounds(bounds)
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
  }, [map, communities, userCoordinates])

  const centerOnUser = () => {
    if (map && userCoordinates) {
      map.setCenter(userCoordinates)
      map.setZoom(13)
    }
  }

  if (isLoading) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-muted rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {userCoordinates && (
          <Button size="sm" variant="secondary" onClick={centerOnUser} className="shadow-lg">
            <Locate className="w-4 h-4 mr-2" />
            Center on Me
          </Button>
        )}
      </div>

      {/* Community markers */}
      {map &&
        communities.map((community) => {
          if (!community.latitude || !community.longitude) return null

          return (
            <MapMarker
              key={community.id}
              map={map}
              position={{ lat: community.latitude, lng: community.longitude }}
              title={community.name}
              type="community"
              content={`
              <div class="p-2 min-w-[200px]">
                <h3 class="font-semibold text-sm">${community.name}</h3>
                <p class="text-xs text-gray-600 mt-1">${community.location_city}</p>
                <p class="text-xs text-gray-500">${community.member_count} members</p>
                ${community.is_member ? '<p class="text-xs text-green-600 mt-1">✓ Member</p>' : ''}
                ${community.distance_km ? `<p class="text-xs text-blue-600 mt-1">${community.distance_km} km away</p>` : ''}
              </div>
            `}
              onClick={() => onCommunityClick?.(community)}
            />
          )
        })}

      {/* User location marker */}
      {map && userCoordinates && showUserLocation && (
        <MapMarker map={map} position={userCoordinates} title="Your Location" type="user" />
      )}
    </div>
  )
}
