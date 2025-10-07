'use client'

import { useState, useCallback } from 'react'
import { PostFeed } from '@/components/posts/post-feed'
import { FeedFilters } from './feed-filters'
import { useLocation } from '@/lib/context/location-context'
import { Card } from '@/components/ui/card'

export function LocationFeed() {
  const { userCity, radius } = useLocation()
  const [sort, setSort] = useState<'recent' | 'popular'>('recent')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setRefreshKey((prev) => prev + 1)
    setTimeout(() => setIsRefreshing(false), 500)
  }, [])

  const handleSortChange = useCallback((newSort: 'recent' | 'popular') => {
    setSort(newSort)
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <div className="space-y-6">
      {/* Feed Filters */}
      <Card className="p-4">
        <FeedFilters
          currentSort={sort}
          onSortChange={handleSortChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </Card>

      {/* Post Feed */}
      <PostFeed key={refreshKey} useFeedApi={true} sort={sort} city={userCity} radius={radius} />
    </div>
  )
}
