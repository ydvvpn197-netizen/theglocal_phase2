'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, MessageSquare, MapPin, Calendar, Shield, TrendingUp } from 'lucide-react'

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
  created_by: string
  created_at: string
  category?: string
  activity_score?: number
}

interface CommunitySidebarProps {
  community: Community
  isMember: boolean
  isAdmin: boolean
}

export function CommunitySidebar({ community, isMember, isAdmin }: CommunitySidebarProps) {
  return (
    <div className="space-y-4 sticky top-6">
      {/* Community Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Community Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Members</span>
            </div>
            <span className="font-semibold">{community.member_count.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Posts</span>
            </div>
            <span className="font-semibold">{community.post_count.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Created</span>
            </div>
            <span className="text-sm">
              {new Date(community.created_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {community.activity_score !== undefined && community.activity_score > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Activity Score</span>
              </div>
              <Badge variant="secondary">{community.activity_score}</Badge>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-2 pt-2 border-t text-primary">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">You are an admin</span>
            </div>
          )}

          {isMember && !isAdmin && (
            <div className="pt-2 border-t">
              <Badge variant="outline" className="w-full justify-center">
                Member
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community Rules Card */}
      {community.rules && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Community Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {community.rules}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{community.location_city}</span>
          </div>
        </CardContent>
      </Card>

      {/* Community Type Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Community Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {community.is_private ? (
              <Badge variant="outline">Private</Badge>
            ) : (
              <Badge variant="outline">Public</Badge>
            )}
            {community.category && (
              <Badge variant="secondary" className="capitalize">
                {community.category}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
