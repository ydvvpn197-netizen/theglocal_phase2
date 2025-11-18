'use client'

import { LocationRadiusSlider } from './location-radius-slider'

interface FeedFiltersProps {
  currentSort: 'recent' | 'popular'
  onSortChange: (sort: 'recent' | 'popular') => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function FeedFilters({
  currentSort,
  onSortChange,
  onRefresh,
  isRefreshing = false,
}: FeedFiltersProps) {
  return (
    <LocationRadiusSlider
      currentSort={currentSort}
      onSortChange={onSortChange}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
    />
  )
}
