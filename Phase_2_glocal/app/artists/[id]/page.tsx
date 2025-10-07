import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface ArtistProfilePageProps {
  params: { id: string }
}

export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const supabase = await createClient()

  // Fetch artist
  const { data: artist, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !artist) {
    return notFound()
  }

  // Increment profile view count
  await supabase
    .from('artists')
    .update({ profile_views: (artist.profile_views || 0) + 1 })
    .eq('id', params.id)

  // Fetch artist's upcoming events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('artist_id', params.id)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(5)

  const rateRange =
    artist.rate_min && artist.rate_max
      ? `₹${artist.rate_min.toLocaleString()} - ₹${artist.rate_max.toLocaleString()}`
      : 'Contact for pricing'

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                {/* Profile Image */}
                {artist.portfolio_images && artist.portfolio_images[0] && (
                  <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={artist.portfolio_images[0]}
                      alt={artist.stage_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <div>
                    <h1 className="text-3xl font-bold">{artist.stage_name}</h1>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Badge className="capitalize">
                        {artist.service_category.replace('_', ' ')}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {artist.location_city}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>New Artist</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{artist.profile_views || 0} views</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-lg font-semibold text-brand-primary">
                    <DollarSign className="h-5 w-5" />
                    {rateRange}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {artist.description && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{artist.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Portfolio */}
          {artist.portfolio_images && artist.portfolio_images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {artist.portfolio_images.map((url: string, index: number) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg">
                      <Image
                        src={url}
                        alt={`Portfolio ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          {events && events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
                  >
                    <Calendar className="mt-1 h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.event_date).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Book This Artist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Send a booking request with your event details
              </p>

              <Button asChild className="w-full">
                <Link href={`/bookings/create?artist=${params.id}`}>Request Booking</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artist Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profile Views</span>
                <span className="font-medium">{artist.profile_views || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">
                  {new Date(artist.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="capitalize">
                  {artist.subscription_status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: ArtistProfilePageProps) {
  const supabase = await createClient()

  const { data: artist } = await supabase
    .from('artists')
    .select('stage_name, description, service_category')
    .eq('id', params.id)
    .single()

  if (!artist) {
    return {
      title: 'Artist Not Found',
    }
  }

  return {
    title: `${artist.stage_name} - ${artist.service_category}`,
    description: artist.description?.slice(0, 160) || `Book ${artist.stage_name} on Theglocal`,
  }
}
