'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Users, MessageSquare, MapPin, Shield, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useToast } from '@/lib/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  rules: string | null
  location_city: string
  member_count: number
  post_count: number
  is_private: boolean
  is_featured: boolean
  created_by: string
  created_at: string
}

interface CommunityHeaderProps {
  slug: string
}

export function CommunityHeader({ slug }: CommunityHeaderProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [community, setCommunity] = useState<Community | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    fetchCommunity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const fetchCommunity = async () => {
    try {
      const response = await fetch(`/api/communities/${slug}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch community')
      }

      setCommunity(result.data.community)
      setIsMember(result.data.isMember)
      setIsAdmin(result.data.isAdmin)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load community',
        variant: 'destructive',
      })
      router.push('/communities')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinLeave = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to join communities',
        variant: 'destructive',
      })
      router.push('/auth/signup')
      return
    }

    setIsJoining(true)
    try {
      const endpoint = isMember ? `/api/communities/${slug}/leave` : `/api/communities/${slug}/join`

      const response = await fetch(endpoint, {
        method: isMember ? 'DELETE' : 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update membership')
      }

      setIsMember(!isMember)
      setCommunity((prev) =>
        prev ? { ...prev, member_count: prev.member_count + (isMember ? -1 : 1) } : null
      )

      toast({
        title: isMember ? 'Left Community' : 'Joined Community',
        description: isMember ? `You left ${community?.name}` : `Welcome to ${community?.name}!`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update membership',
        variant: 'destructive',
      })
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!community) {
    return null
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{community.name}</h1>
            {community.is_featured && <Badge variant="secondary">Featured</Badge>}
            {community.is_private && <Badge variant="outline">Private</Badge>}
            {isAdmin && (
              <Badge variant="default" className="bg-brand-accent">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>

          {community.description && (
            <p className="text-muted-foreground mt-2">{community.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{community.location_city}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{community.member_count.toLocaleString()} members</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{community.post_count.toLocaleString()} posts</span>
            </div>
          </div>

          {community.rules && (
            <div className="mt-4 p-4 bg-muted/50 rounded-md">
              <h3 className="font-medium text-sm mb-2">Community Rules</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{community.rules}</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <Button onClick={handleJoinLeave} disabled={isJoining} className="w-full md:w-auto">
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isMember ? 'Leaving...' : 'Joining...'}
              </>
            ) : isMember ? (
              'Leave Community'
            ) : (
              'Join Community'
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
