'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, MessageSquare, TrendingUp, Activity } from 'lucide-react'

interface Analytics {
  overview: {
    totalMembers: number
    totalPosts: number
    totalComments: number
    engagementRate: number
  }
  memberGrowth: Array<{ joined_at: string }>
  postActivity: Array<{ created_at: string }>
  topContributors: Array<{ userId: string; handle: string; posts: number }>
  popularPosts: Array<{
    id: string
    title: string
    upvotes: number
    comment_count: number
    created_at: string
  }>
}

interface CommunityAnalyticsProps {
  slug: string
}

export function CommunityAnalytics({ slug }: CommunityAnalyticsProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/communities/${slug}/analytics`, {
        credentials: 'include',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      setAnalytics(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{analytics.memberGrowth.length} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Total Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{analytics.postActivity.length} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Total Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalComments}</div>
            <p className="text-xs text-muted-foreground mt-1">Community engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.engagementRate}</div>
            <p className="text-xs text-muted-foreground mt-1">Posts + comments per member</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors (Last 30 Days)</CardTitle>
          <CardDescription>Members with most posts</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topContributors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.topContributors.map((contributor, idx) => (
                <div
                  key={contributor.userId}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{contributor.handle}</div>
                      <div className="text-sm text-muted-foreground">
                        {contributor.posts} {contributor.posts === 1 ? 'post' : 'posts'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Posts (Last 30 Days)</CardTitle>
          <CardDescription>Posts with highest engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.popularPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.popularPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium line-clamp-1">{post.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {post.upvotes} upvotes • {post.comment_count} comments
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
