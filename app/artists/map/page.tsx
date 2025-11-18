'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { ArtistFilters } from '@/components/artists/artist-filters'
import { List, Loader2, MapPin } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'

// Dynamic import for map component (saves ~200KB from initial bundle)
const ArtistMap = dynamic(
  () => import('@/components/maps/artist-map').then((mod) => ({ default: mod.ArtistMap })),
  {
    loading: () => (
      <div className="h-[600px] w-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center space-y-2">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false, // Maps require browser APIs
  }
)

interface Artist {
  id: string
  stage_name: string
  service_category: string
  location_city: string
  distance_km?: number
  rate_min?: number
  rate_max?: number
  latitude?: number
  longitude?: number
}

export default function ArtistsMapPage() {
  const router = useRouter()
  const { userCoordinates, radius } = useLocation()

  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')

  const fetchArtists = useCallback(async () => {
    if (!userCoordinates) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        lat: userCoordinates.lat.toString(),
        lng: userCoordinates.lng.toString(),
        radius: radius.toString(),
        limit: '100', // Get more for map view
      })

      if (searchQuery) params.append('search', searchQuery)
      if (category && category !== 'all') params.append('category', category)

      const response = await fetch(`/api/v2/artists?${params}`)
      const result = await response.json()

      if (response.ok) {
        // Parse coordinates from result
        const artistsWithCoords = (result.data || []).map((artist: unknown) => {
          if (!artist || typeof artist !== 'object') return artist
          const artistRecord = artist as Record<string, unknown>
          // Try to parse coordinates from location_coordinates
          let latitude, longitude
          const locationCoords = artistRecord.location_coordinates
          if (locationCoords && typeof locationCoords === 'string') {
            const match = locationCoords.match(/POINT\(([^ ]+) ([^ ]+)\)/)
            if (match && match[1] && match[2]) {
              longitude = parseFloat(match[1])
              latitude = parseFloat(match[2])
            }
          }
          return { ...artistRecord, latitude, longitude }
        })

        setArtists(artistsWithCoords)
      }
    } catch (error) {
      logger.error('Failed to fetch artists:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userCoordinates, radius, searchQuery, category])

  useEffect(() => {
    fetchArtists()
  }, [fetchArtists])

  const handleArtistClick = (artist: Artist) => {
    router.push(`/artists/${artist.id}`)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Artists Map View</h1>
            <p className="mt-2 text-muted-foreground">Discover artists near you on the map</p>
          </div>

          <Button variant="outline" onClick={() => router.push('/artists')}>
            <List className="mr-2 h-4 w-4" />
            List View
          </Button>
        </div>

        {/* Filters */}
        <ArtistFilters onSearchChange={setSearchQuery} onCategoryChange={setCategory} />

        {/* Map */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !userCoordinates ? (
          <div className="flex flex-col items-center justify-center h-[600px] bg-muted rounded-lg">
            <p className="text-muted-foreground mb-4">Please set your location to use map view</p>
            <Button onClick={() => router.push('/artists')}>Go to List View</Button>
          </div>
        ) : (
          <ArtistMap artists={artists} onArtistClick={handleArtistClick} height="600px" />
        )}

        {/* Artist Count */}
        {!isLoading && artists.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {artists.length} artists within {radius} km
          </p>
        )}
      </div>
    </div>
  )
}
