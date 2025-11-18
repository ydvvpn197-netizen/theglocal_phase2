'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, AlertTriangle, Clock, RotateCcw, Loader2, Archive, Trash2 } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface ArchivedCommunity {
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
  is_deleted: boolean
  deleted_at: string
  deleted_by: string
  deletion_scheduled_for: string
  user_role?: string
  is_member?: boolean
}

export default function ArchivedCommunitiesPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [communities, setCommunities] = useState<ArchivedCommunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const fetchArchivedCommunities = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/communities/archived')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(result.error || 'Failed to fetch archived communities')
      }

      setCommunities(result.data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load archived communities',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, router])

  useEffect(() => {
    fetchArchivedCommunities()
  }, [fetchArchivedCommunities])

  const calculateTimeLeft = (scheduledFor: string) => {
    const deletionTime = new Date(scheduledFor).getTime()
    const now = new Date().getTime()
    const difference = deletionTime - now

    if (difference <= 0) {
      return { expired: true, display: 'Expired' }
    }

    const hours = Math.floor(difference / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return { expired: false, display: `${hours}h ${minutes}m remaining` }
    } else if (minutes > 0) {
      return { expired: false, display: `${minutes}m remaining` }
    } else {
      return { expired: false, display: 'Less than 1 minute' }
    }
  }

  const handleRestore = async (community: ArchivedCommunity) => {
    const timeLeft = calculateTimeLeft(community.deletion_scheduled_for)

    if (timeLeft.expired) {
      toast({
        title: 'Cannot Restore',
        description: 'The recovery window for this community has expired.',
        variant: 'destructive',
      })
      return
    }

    setRestoringId(community.id)

    try {
      const response = await fetch(`/api/communities/${community.slug}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to restore community')
      }

      toast({
        title: 'Community Restored',
        description: `"${community.name}" has been restored successfully.`,
      })

      // Refresh the list
      fetchArchivedCommunities()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restore community',
        variant: 'destructive',
      })
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/communities">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Communities
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Archive className="h-8 w-8 text-muted-foreground" />
              <h1 className="text-3xl font-bold">Archived Communities</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Communities you&apos;ve deleted that can still be restored
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Recovery Window</p>
                <p className="text-muted-foreground">
                  Deleted communities can be restored within 24 hours. After this period, they will
                  be permanently deleted.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communities List */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-2">No archived communities</p>
              <p className="text-sm text-muted-foreground mb-4">
                Communities you delete will appear here for 24 hours before permanent deletion.
              </p>
              <Link href="/communities">
                <Button variant="outline">Browse Communities</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {communities.map((community) => {
              const timeLeft = calculateTimeLeft(community.deletion_scheduled_for)
              const deletedAt = new Date(community.deleted_at).toLocaleString()

              return (
                <Card key={community.id} className="border-destructive/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-xl">{community.name}</CardTitle>
                          {community.is_private && (
                            <Badge variant="outline" className="text-xs">
                              Private
                            </Badge>
                          )}
                          <Badge variant="destructive" className="text-xs">
                            <Trash2 className="mr-1 h-3 w-3" />
                            Deleted
                          </Badge>
                        </div>

                        {community.description && (
                          <CardDescription>{community.description}</CardDescription>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{community.location_city}</span>
                          <span>•</span>
                          <span>{community.member_count} members</span>
                          <span>•</span>
                          <span>{community.post_count} posts</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleRestore(community)}
                          disabled={timeLeft.expired || restoringId === community.id}
                        >
                          {restoringId === community.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Restoring...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </>
                          )}
                        </Button>
                        <Link href={`/communities/${community.slug}`}>
                          <Button size="sm" variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock
                        className={`h-4 w-4 flex-shrink-0 mt-0.5 ${timeLeft.expired ? 'text-destructive' : 'text-orange-500'}`}
                      />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium">
                            {timeLeft.expired ? 'Recovery Expired' : timeLeft.display}
                          </span>
                          <span className="text-xs text-muted-foreground">Deleted {deletedAt}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {timeLeft.expired
                            ? 'This community can no longer be restored and will be permanently deleted soon.'
                            : 'After this time, the community will be permanently deleted and cannot be restored.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
