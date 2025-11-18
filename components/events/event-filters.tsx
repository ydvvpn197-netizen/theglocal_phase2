'use client'

import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

interface EventFiltersProps {
  category: string
  dateFilter: string
  onCategoryChange: (category: string) => void
  onDateFilterChange: (date: string) => void
}

export function EventFilters({
  category,
  dateFilter,
  onCategoryChange,
  onDateFilterChange,
}: EventFiltersProps) {
  const categories = [
    { value: 'all', label: 'All Events' },
    { value: 'movie', label: 'Movies' },
    { value: 'concert', label: 'Concerts' },
    { value: 'play', label: 'Plays' },
    { value: 'sports', label: 'Sports' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'workshop', label: 'Workshops' },
  ]

  const dateFilters = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
  ]

  return (
    <div className="space-y-4">
      {/* Category Filters */}
      <div>
        <div className="mb-2 text-sm font-medium">Category</div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat.value}
              variant={category === cat.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => onCategoryChange(cat.value)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">When:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              {dateFilters.find((d) => d.value === dateFilter)?.label || 'All Dates'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {dateFilters.map((filter) => (
              <DropdownMenuItem key={filter.value} onClick={() => onDateFilterChange(filter.value)}>
                {filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
