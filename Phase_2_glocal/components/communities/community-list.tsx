'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { CommunityCard } from './community-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  location_city: string
  member_count: number
  post_count: number
  is_private: boolean
  is_featured: boolean
  created_at: string
}

export function CommunityList() {
  const { toast } = useToast()
  const [communities, setCommunities] = useState<Community[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'popular' | 'nearby'>('all')

  const fetchCommunities = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/communities?filter=${filterBy}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch communities')
      }

      setCommunities(result.data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load communities',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [filterBy, toast])

  useEffect(() => {
    fetchCommunities()
  }, [fetchCommunities])

  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterBy === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('all')}
          >
            All
          </Button>
          <Button
            variant={filterBy === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('popular')}
          >
            Popular
          </Button>
          <Button
            variant={filterBy === 'nearby' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterBy('nearby')}
          >
            <Filter className="mr-2 h-4 w-4" />
            Nearby
          </Button>
        </div>
      </div>

      {/* Communities Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? 'No communities found matching your search'
              : 'No communities available. Be the first to create one!'}
          </p>
          {!searchQuery && (
            <Link href="/communities/create">
              <Button className="mt-4">Create First Community</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      )}
    </div>
  )
}
