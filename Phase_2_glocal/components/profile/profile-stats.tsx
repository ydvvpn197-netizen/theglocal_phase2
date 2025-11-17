'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, FileText, MessageCircle } from 'lucide-react'
import { formatKarma } from '@/lib/utils/profile-helpers'

interface ProfileStatsProps {
  stats: {
    post_karma: number
    comment_karma: number
    total_karma: number
    post_count: number
    comment_count: number
    community_count: number
  }
  showKarma?: boolean
}

export function ProfileStats({ stats, showKarma = true }: ProfileStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Karma */}
      {showKarma && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karma</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKarma(stats.total_karma)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Post: {formatKarma(stats.post_karma)} • Comment: {formatKarma(stats.comment_karma)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Posts</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.post_count.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.post_count === 1 ? 'post created' : 'posts created'}
          </p>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Comments</CardTitle>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.comment_count.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.comment_count === 1 ? 'comment made' : 'comments made'}
          </p>
        </CardContent>
      </Card>

      {/* Communities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Communities</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.community_count.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.community_count === 1 ? 'community joined' : 'communities joined'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
