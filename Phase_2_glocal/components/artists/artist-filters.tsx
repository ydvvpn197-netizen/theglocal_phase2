'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { ARTIST_CATEGORIES } from '@/lib/utils/constants'

interface ArtistFiltersProps {
  onSearchChange?: (query: string) => void
  onCategoryChange?: (category: string) => void
}

export function ArtistFilters({ onSearchChange, onCategoryChange }: ArtistFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange?.(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, onSearchChange])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    onCategoryChange?.(category)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search artists by name or skill..."
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div>
        <div className="mb-2 text-sm font-medium">Category</div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => handleCategoryChange('all')}
          >
            All
          </Badge>
          {ARTIST_CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => handleCategoryChange(category)}
            >
              {category.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
