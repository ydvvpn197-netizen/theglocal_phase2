'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArtistCard } from './artist-card'
import { Loader2 } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'

interface Artist {
  id: string
  user_id: string
  stage_name: string
  service_category: string
  description: string | null
  location_city: string
  rate_min: number | null
  rate_max: number | null
  portfolio_images: string[] | null
  profile_views: number
  subscription_status: string
  created_at: string
}

export function ArtistList() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userCity } = useLocation()

  const fetchArtists = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (userCity) params.append('city', userCity)

      const response = await fetch(`/api/artists?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch artists')
      }

      setArtists(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artists')
    } finally {
      setIsLoading(false)
    }
  }, [userCity])

  useEffect(() => {
    fetchArtists()
  }, [fetchArtists])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive">{error}</p>
        <button
          onClick={fetchArtists}
          className="mt-4 text-sm text-destructive underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (artists.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-lg">No artists found</p>
        <p className="mt-2 text-sm">Try adjusting your filters or be the first to register!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  )
}
