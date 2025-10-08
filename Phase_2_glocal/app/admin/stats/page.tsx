'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, Building2, FileText, Palette, TrendingUp, MessageSquare } from 'lucide-react'

interface AdminStats {
  total_users: number
  total_communities: number
  total_posts: number
  total_comments: number
  total_artists: number
  active_artists: number
  active_users_7d: number
  active_users_30d: number
  posts_24h: number
  comments_24h: number
  new_users_7d: number
  subscriptions_active: number
  subscriptions_trial: number
  total_revenue_monthly: number
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch stats')
      }

      setStats(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center text-destructive">{error}</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Platform Statistics</h1>
          <p className="mt-2 text-muted-foreground">
            Comprehensive metrics and analytics
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
          <h2 className="text-xl font-semibold mb-4">Activity Metrics</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Active Users (DAU)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{stats?.active_users_7d || 0}</div>
                <p className="text-sm text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Active Users (MAU)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{stats?.active_users_30d || 0}</div>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Users (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-green-600">
                  +{stats?.new_users_7d || 0}
                </div>
                <p className="text-sm text-muted-foreground">Growth this week</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Activity */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Content Activity (Last 24 Hours)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <FileText className="h-8 w-8 text-brand-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats?.posts_24h || 0}</div>
                  <div className="text-sm text-muted-foreground">Posts Created</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <MessageSquare className="h-8 w-8 text-brand-secondary" />
                <div>
                  <div className="text-2xl font-bold">{stats?.comments_24h || 0}</div>
                  <div className="text-sm text-muted-foreground">Comments Posted</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Artist & Subscriptions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Artist Platform</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{stats?.active_artists || 0}</div>
                <p className="text-sm text-muted-foreground">With active subscriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trial Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-yellow-600">
                  {stats?.subscriptions_trial || 0}
                </div>
                <p className="text-sm text-muted-foreground">In 30-day free trial</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-green-600">
                  ₹{(stats?.total_revenue_monthly || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">From artist subscriptions</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
