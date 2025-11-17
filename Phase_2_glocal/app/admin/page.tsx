import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Users,
  Flag,
  BarChart3,
  Palette,
  Building2,
  Activity,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

export default async function SuperAdminDashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signup')
  }

  // Check if user is super admin
  const isAdmin = await isSuperAdmin(user.id)

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have super admin access to view this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get quick stats
  const [
    { count: totalUsers },
    { count: totalCommunities },
    { count: totalPosts },
    { count: totalArtists },
    { count: pendingReports },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('communities').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('artists').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-brand-primary" />
            <Badge variant="destructive">Super Admin</Badge>
          </div>
          <h1 className="text-3xl font-bold">Platform Administration</h1>
          <p className="mt-2 text-muted-foreground">Platform-wide management and monitoring</p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Users className="h-8 w-8 text-brand-primary" />
              <div>
                <div className="text-2xl font-bold">{totalUsers || 0}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Building2 className="h-8 w-8 text-brand-secondary" />
              <div>
                <div className="text-2xl font-bold">{totalCommunities || 0}</div>
                <div className="text-sm text-muted-foreground">Communities</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <BarChart3 className="h-8 w-8 text-brand-accent" />
              <div>
                <div className="text-2xl font-bold">{totalPosts || 0}</div>
                <div className="text-sm text-muted-foreground">Posts</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Palette className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{totalArtists || 0}</div>
                <div className="text-sm text-muted-foreground">Artists</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Flag className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{pendingReports || 0}</div>
                <div className="text-sm text-muted-foreground">Pending Reports</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/stats">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5" />
                  Platform Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Detailed analytics and metrics</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/reports">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag className="h-5 w-5" />
                  Reports Queue
                  {pendingReports && pendingReports > 0 ? (
                    <Badge variant="destructive">{pendingReports}</Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Review and manage reports</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage users and bans</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/artists">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-5 w-5" />
                  Artist Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage artist subscriptions</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/communities">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5" />
                  Communities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Feature and manage communities</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/health">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5" />
                  API Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Monitor external APIs</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Super Admin Dashboard - Theglocal',
  description: 'Platform administration and management',
}
