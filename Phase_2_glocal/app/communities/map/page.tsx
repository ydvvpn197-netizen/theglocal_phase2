'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { List, Loader2, MapPin } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'

// Dynamic import for map component (saves ~200KB from initial bundle)
const CommunityMap = dynamic(
  () => import('@/components/maps/community-map').then((mod) => ({ default: mod.CommunityMap })),
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

interface Community {
  id: string
  name: string
  slug: string
  description?: string | null
  location_city: string
  location_coordinates?: string | null
  member_count: number
  post_count?: number
  is_private?: boolean
  is_featured?: boolean
  is_deleted?: boolean
  created_at?: string
  updated_at?: string
  distance_km?: number
  is_member?: boolean
  user_role?: string | null
  latitude?: number
  longitude?: number
}

export default function CommunitiesMapPage() {
  const router = useRouter()
  const { userCoordinates, radius } = useLocation()

  const [communities, setCommunities] = useState<Community[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCommunities = useCallback(async () => {
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
        limit: '100',
      })

      const response = await fetch(`/api/v2/communities?${params}`)
      const result = await response.json()

      if (response.ok) {
        // Parse coordinates
        const communitiesWithCoords = (result.data || []).map((community: unknown) => {
          if (!community || typeof community !== 'object') return community
          const communityRecord = community as Record<string, unknown>
          let latitude, longitude

          const locationCoords = communityRecord.location_coordinates
          if (locationCoords && typeof locationCoords === 'string') {
            const match = locationCoords.match(/POINT\(([^ ]+) ([^ ]+)\)/)
            if (match && match[1] && match[2]) {
              longitude = parseFloat(match[1])
              latitude = parseFloat(match[2])
            }
          }

          return { ...communityRecord, latitude, longitude }
        })

        setCommunities(communitiesWithCoords)
      }
    } catch (error) {
      logger.error('Failed to fetch communities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userCoordinates, radius])

  useEffect(() => {
    fetchCommunities()
  }, [fetchCommunities])

  const handleCommunityClick = (community: Community) => {
    router.push(`/communities/${community.slug}`)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Communities Map View</h1>
            <p className="mt-2 text-muted-foreground">Explore local communities near you</p>
          </div>

          <Button variant="outline" onClick={() => router.push('/communities')}>
            <List className="mr-2 h-4 w-4" />
            List View
          </Button>
        </div>

        {/* Map */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !userCoordinates ? (
          <div className="flex flex-col items-center justify-center h-[600px] bg-muted rounded-lg">
            <p className="text-muted-foreground mb-4">Please set your location to use map view</p>
            <Button onClick={() => router.push('/communities')}>Go to List View</Button>
          </div>
        ) : (
          <CommunityMap
            communities={communities}
            onCommunityClick={handleCommunityClick}
            height="600px"
          />
        )}

        {/* Community Count */}
        {!isLoading && communities.length > 0 && (
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <p>
              Showing {communities.length} communities within {radius} km
            </p>
            <p className="text-xs">
              {communities.filter((c) => c.is_member).length} joined •
              {communities.filter((c) => !c.is_member).length} to explore
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
