'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, FileText, Palette, TrendingUp, MessageSquare, Loader2 } from 'lucide-react'

interface PlatformStats {
  total_users: number
  total_communities: number
  total_posts: number
  total_artists: number
  active_users_7d: number
  active_users_30d: number
  posts_24h: number
  comments_24h: number
}

export default function TransparencyStatsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/transparency/stats')
      const result = await response.json()
      
      if (response.ok) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Platform Statistics</h1>
          <p className="mt-2 text-muted-foreground">
            Real-time metrics about our platform and community
          </p>
        </div>

        {/* Overall Metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Overall Metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Users className="h-8 w-8 text-brand-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats?.total_users?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Building2 className="h-8 w-8 text-brand-secondary" />
                <div>
                  <div className="text-2xl font-bold">{stats?.total_communities?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Communities</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <FileText className="h-8 w-8 text-brand-accent" />
                <div>
                  <div className="text-2xl font-bold">{stats?.total_posts?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Palette className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{stats?.total_artists?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Artists</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Metrics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Active Users</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{stats?.active_users_7d?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Active (7 days)</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats?.active_users_30d?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Active (30 days)</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <MessageSquare className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {((stats?.posts_24h || 0) + (stats?.comments_24h || 0)).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Content (24h)</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Engagement Breakdown */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Last 24 Hours</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content Created</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Posts</span>
                  <span className="font-semibold">{stats?.posts_24h?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Comments</span>
                  <span className="font-semibold">{stats?.comments_24h?.toLocaleString() || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Posts/Community</span>
                  <span className="font-semibold">
                    {stats && stats.total_communities > 0
                      ? (stats.total_posts / stats.total_communities).toFixed(1)
                      : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Artists</span>
                  <span className="font-semibold">{stats?.total_artists?.toLocaleString() || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Learn More */}
        <Card className="border-brand-primary/20 bg-brand-primary/5">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Want to learn more?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explore detailed moderation practices, privacy policies, and community guidelines.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/transparency/moderation"
                className="text-sm text-brand-primary hover:underline"
              >
                Moderation Log →
              </Link>
              <Link
                href="/transparency/privacy"
                className="text-sm text-brand-primary hover:underline"
              >
                Privacy Metrics →
              </Link>
              <Link href="/transparency/guidelines" className="text-sm text-brand-primary hover:underline">
                Community Guidelines →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Platform Transparency - Theglocal',
  description: 'Explore platform metrics, moderation decisions, and privacy practices',
}

