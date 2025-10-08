'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Star, Eye, Flag, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Community {
  id: string
  name: string
  slug: string
  description: string
  location_city: string
  member_count: number
  is_featured: boolean
  created_at: string
}

export default function AdminCommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCommunities()
  }, [])

  const fetchCommunities = async () => {
    try {
      const response = await fetch('/api/admin/communities')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch communities')
      }

      setCommunities(result.data || [])
    } catch (error) {
      console.error('Error fetching communities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFeatured = async (communityId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/communities/${communityId}/feature`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !currentStatus }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update community')
      }

      fetchCommunities()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update community')
    }
  }

  const handleRemoveCommunity = async (communityId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the community "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/communities/${communityId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove community')
      }

      fetchCommunities()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove community')
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Communities Management</h1>
          <p className="mt-2 text-muted-foreground">Manage and feature communities</p>
        </div>

        {/* Communities List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : communities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No communities found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {communities.map((community) => (
              <Card key={community.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{community.name}</h3>
                        {community.is_featured && (
                          <Badge variant="default" className="bg-yellow-500">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">{community.description}</p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{community.location_city}</span>
                        <span>•</span>
                        <span>{community.member_count} members</span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(community.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/communities/${community.slug}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant={community.is_featured ? 'default' : 'outline'}
                        onClick={() => handleToggleFeatured(community.id, community.is_featured)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        {community.is_featured ? 'Unfeature' : 'Feature'}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveCommunity(community.id, community.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
