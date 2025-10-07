'use client'

import { useState, useEffect, useCallback } from 'react'
import { NewsCard } from './news-card'
import { RedditCard } from './reddit-card'
import { FeedItem } from './feed-item'
import { Loader2 } from 'lucide-react'
import { useLocation } from '@/lib/context/location-context'

interface DiscoveryItem {
  id: string
  type: 'news' | 'reddit' | 'event'
  title: string
  description?: string
  url?: string
  source?: string
  author?: string
  publishedAt?: string
  imageUrl?: string
  subreddit?: string
  upvotes?: number
  comments?: number
  eventDate?: string
  location?: string
}

export function DiscoveryFeed() {
  const [items, setItems] = useState<DiscoveryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userCity } = useLocation()

  const fetchDiscovery = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (userCity) params.append('city', userCity)

      const response = await fetch(`/api/discover?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch discovery content')
      }

      setItems(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discovery feed')
    } finally {
      setIsLoading(false)
    }
  }, [userCity])

  useEffect(() => {
    fetchDiscovery()
  }, [fetchDiscovery])

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
          onClick={fetchDiscovery}
          className="mt-4 text-sm text-destructive underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-lg">No content available</p>
        <p className="mt-2 text-sm">
          Discovery content will appear here from news, Reddit, and events
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        switch (item.type) {
          case 'news':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <NewsCard key={item.id} item={item as any} />
          case 'reddit':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <RedditCard key={item.id} item={item as any} />
          case 'event':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <FeedItem key={item.id} item={item as any} />
          default:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <FeedItem key={item.id} item={item as any} />
        }
      })}
    </div>
  )
}
