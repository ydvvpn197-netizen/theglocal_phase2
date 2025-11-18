'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, MessageSquare, MapPin } from 'lucide-react'

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

interface CommunityCardProps {
  community: Community
}

export function CommunityCard({ community }: CommunityCardProps) {
  return (
    <Link href={`/communities/${community.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-1">{community.name}</CardTitle>
            {community.is_featured && (
              <Badge variant="secondary" className="text-xs">
                Featured
              </Badge>
            )}
          </div>
          {community.description && (
            <CardDescription className="line-clamp-2">{community.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{community.location_city}</span>
            {community.is_private && (
              <Badge variant="outline" className="text-xs ml-auto">
                Private
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{community.member_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{community.post_count.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
