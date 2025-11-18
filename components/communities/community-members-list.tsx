'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, Shield, User } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: string
  joined_at: string
  users: {
    anonymous_handle: string
  }
}

interface CommunityMembersListProps {
  communityId: string
  isAdmin?: boolean
}

export function CommunityMembersList({
  communityId,
  isAdmin: _isAdmin = false,
}: CommunityMembersListProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/communities/${communityId}/members`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch members')
      }

      setMembers(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }, [communityId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Community Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {member.role === 'admin' ? (
                  <Shield className="h-5 w-5 text-brand-primary" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">{member.users.anonymous_handle}</div>
                  <div className="text-sm text-muted-foreground">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <Badge
                variant={member.role === 'admin' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {member.role}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
