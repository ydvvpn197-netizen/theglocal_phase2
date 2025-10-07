import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArtistDashboard } from '@/components/artists/artist-dashboard'
import { Calendar, Eye, Users, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function ArtistDashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signup')
  }

  // Get artist profile
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!artist) {
    redirect('/artists/register')
  }

  // Get artist stats
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, rsvp_count')
    .eq('artist_id', artist.id)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(5)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, created_at')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = {
    profileViews: artist.profile_views || 0,
    totalEvents: events?.length || 0,
    upcomingEvents: events?.filter((e) => new Date(e.event_date) > new Date()).length || 0,
    totalBookings: bookings?.length || 0,
    pendingBookings: bookings?.filter((b) => b.status === 'pending').length || 0,
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Artist Dashboard</h1>
            <p className="mt-2 text-muted-foreground">Welcome back, {artist.stage_name}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/artists/${artist.id}`}>View Profile</Link>
            </Button>
            <Button asChild>
              <Link href="/events/create">Create Event</Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Eye className="h-8 w-8 text-brand-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.profileViews}</div>
                <div className="text-sm text-muted-foreground">Profile Views</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Calendar className="h-8 w-8 text-brand-secondary" />
              <div>
                <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                <div className="text-sm text-muted-foreground">Upcoming Events</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Users className="h-8 w-8 text-brand-accent" />
              <div>
                <div className="text-2xl font-bold">{stats.pendingBookings}</div>
                <div className="text-sm text-muted-foreground">Pending Bookings</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <div className="text-sm text-muted-foreground">Total Bookings</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Status */}
        <Card
          className={
            artist.subscription_status === 'active'
              ? 'border-green-200 bg-green-50'
              : 'border-yellow-200 bg-yellow-50'
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Subscription Status
              <Badge variant={artist.subscription_status === 'active' ? 'default' : 'secondary'}>
                {artist.subscription_status === 'active' ? 'Active' : 'Trial'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {artist.subscription_status === 'active' ? (
              <p className="text-green-700">
                Your subscription is active. You can create events and receive bookings.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-yellow-700">
                  You&apos;re on a free trial. Complete payment to activate your profile.
                </p>
                <Button asChild>
                  <Link href={`/artists/${artist.id}/subscribe`}>Complete Payment</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <ArtistDashboard artist={artist} events={events || []} bookings={bookings || []} />
        </Suspense>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-4 w-3/4 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export const metadata = {
  title: 'Artist Dashboard - Theglocal',
  description: 'Manage your artist profile, events, and bookings',
}
