'use client'

import { useEffect, useState } from 'react'
import {
  createMarker,
  createInfoWindow,
  MARKER_COLORS,
  MarkerType,
} from '@/lib/integrations/google-maps'

interface MapMarkerProps {
  map: google.maps.Map | null
  position: { lat: number; lng: number }
  title: string
  type: MarkerType
  content?: React.ReactNode | string
  onClick?: () => void
}

/**
 * Map Marker Component
 *
 * Creates and manages a Google Maps marker with optional info window
 */
export function MapMarker({ map, position, title, type, content, onClick }: MapMarkerProps) {
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null)

  useEffect(() => {
    if (!map) return

    // Create marker
    const initMarker = async () => {
      const newMarker = await createMarker({
        position,
        map,
        title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: MARKER_COLORS[type],
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        },
      })

      setMarker(newMarker)

      // Create info window if content provided
      if (content) {
        const contentString =
          typeof content === 'string' ? content : '<div id="info-window-content"></div>'

        const newInfoWindow = await createInfoWindow({
          content: contentString,
        })

        setInfoWindow(newInfoWindow)

        // Add click listener to show info window
        newMarker.addListener('click', () => {
          if (onClick) {
            onClick()
          }
          newInfoWindow.open(map, newMarker)
        })
      } else if (onClick) {
        // Just handle click without info window
        newMarker.addListener('click', onClick)
      }
    }

    initMarker()

    // Cleanup
    return () => {
      if (marker) {
        marker.setMap(null)
      }
      if (infoWindow) {
        infoWindow.close()
      }
    }
  }, [map, position, title, type, content, onClick, marker, infoWindow])

  // Update marker position if it changes
  useEffect(() => {
    if (marker) {
      marker.setPosition(position)
    }
  }, [marker, position])

  // This component doesn't render anything to DOM
  // The marker is managed by Google Maps API
  return null
}
