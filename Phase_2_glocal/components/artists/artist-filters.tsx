'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { ARTIST_CATEGORIES } from '@/lib/utils/constants'

export function ArtistFilters() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

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
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Badge>
          {ARTIST_CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setSelectedCategory(category)}
            >
              {category.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
