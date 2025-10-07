'use client'

import { useState } from 'react'
import { MapPin, RefreshCw, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocation } from '@/lib/context/location-context'

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
  const { userCity, radius, setRadius, requestLocation, isLoading } = useLocation()
  const [isChangingLocation, setIsChangingLocation] = useState(false)

  const radiusOptions = [
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
    { value: 50, label: '50 km' },
    { value: 100, label: 'City-wide' },
  ]

  const handleLocationChange = async () => {
    setIsChangingLocation(true)
    await requestLocation()
    setIsChangingLocation(false)
  }

  return (
    <div className="space-y-4">
      {/* Location Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{userCity || 'Location not set'}</span>
              <Badge variant="secondary">{radius} km radius</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing posts from your local communities
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLocationChange}
          disabled={isLoading || isChangingLocation}
        >
          {isChangingLocation ? 'Updating...' : 'Change Location'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Sort Options */}
        <div className="flex gap-2">
          <Button
            variant={currentSort === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('recent')}
          >
            <Clock className="mr-2 h-4 w-4" />
            Recent
          </Button>
          <Button
            variant={currentSort === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('popular')}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Popular
          </Button>
        </div>

        {/* Radius Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MapPin className="mr-2 h-4 w-4" />
              {radius} km
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {radiusOptions.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => setRadius(option.value)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  )
}
