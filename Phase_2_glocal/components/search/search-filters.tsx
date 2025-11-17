'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ARTIST_CATEGORIES } from '@/lib/utils/constants'
import { INDIAN_CITIES } from '@/lib/utils/cities'

export interface SearchFilters {
  type: 'all' | 'artists' | 'events' | 'communities' | 'posts'
  city?: string
  category?: string
  dateFrom?: string
  dateTo?: string
}

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  className?: string
}

export function SearchFilters({ filters, onFiltersChange, className = '' }: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    const updated = { ...localFilters, [key]: value }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  const clearFilters = () => {
    const cleared: SearchFilters = { type: 'all' }
    setLocalFilters(cleared)
    onFiltersChange(cleared)
  }

  const hasActiveFilters =
    filters.type !== 'all' || filters.city || filters.category || filters.dateFrom || filters.dateTo

  // Get category options based on content type
  const getCategoryOptions = () => {
    if (filters.type === 'artists') {
      return ARTIST_CATEGORIES.map((cat) => ({ value: cat, label: cat }))
    }
    // Add event categories if needed
    return []
  }

  const categoryOptions = getCategoryOptions()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Content Type Filter */}
      <div>
        <Label className="mb-2 text-sm font-medium">Content Type</Label>
        <div className="flex flex-wrap gap-2">
          {(['all', 'artists', 'events', 'communities', 'posts'] as const).map((type) => (
            <Badge
              key={type}
              variant={filters.type === type ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => updateFilter('type', type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Location Filter */}
      <div>
        <Label htmlFor="city-filter" className="mb-2 flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Select
          value={filters.city || ''}
          onValueChange={(value) => updateFilter('city', value || undefined)}
        >
          <SelectTrigger id="city-filter">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All cities</SelectItem>
            {INDIAN_CITIES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter (for artists/events) */}
      {categoryOptions.length > 0 && (
        <div>
          <Label
            htmlFor="category-filter"
            className="mb-2 flex items-center gap-2 text-sm font-medium"
          >
            <Tag className="h-4 w-4" />
            Category
          </Label>
          <Select
            value={filters.category || ''}
            onValueChange={(value) => updateFilter('category', value || undefined)}
          >
            <SelectTrigger id="category-filter">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date Range Filter (for events/posts) */}
      {(filters.type === 'events' || filters.type === 'posts' || filters.type === 'all') && (
        <div>
          <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Date Range
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
              />
            </div>
            <div>
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
