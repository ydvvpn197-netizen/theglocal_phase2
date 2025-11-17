import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Star, Calendar } from 'lucide-react'
import { BookingForm } from '@/components/bookings/booking-form'
import Image from 'next/image'

interface BookingCreatePageProps {
  searchParams: Promise<{ artist?: string }>
}

export default async function BookingCreatePage({ searchParams }: BookingCreatePageProps) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/bookings/create')
  }

  const resolvedSearchParams = await searchParams
  const artistId = resolvedSearchParams.artist

  if (!artistId) {
    redirect('/artists')
  }

  // Fetch artist details
  const { data: artist, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single()

  if (error || !artist) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Freelancer/Creator Not Found
            </h1>
            <p className="text-destructive mb-4">
              The freelancer/creator you're trying to book could not be found.
            </p>
            <a
              href="/artists"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Browse Artists
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if artist is accepting bookings
  if (!['trial', 'active'].includes(artist.subscription_status)) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Booking Unavailable</h1>
            <p className="text-destructive mb-4">
              This freelancer/creator is not currently accepting bookings.
            </p>
            <a
              href="/artists"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Browse Other Artists
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rateRange =
    artist.rate_min && artist.rate_max
      ? `₹${artist.rate_min.toLocaleString()} - ₹${artist.rate_max.toLocaleString()}`
      : 'Contact for pricing'

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Book {artist.stage_name}</h1>
          <p className="mt-2 text-muted-foreground">
            Send a booking request with your event details
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking Request</CardTitle>
              </CardHeader>
              <CardContent>
                <BookingForm artistId={artist.id} artistName={artist.stage_name} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Freelancer/Creator Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Freelancer/Creator Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Freelancer/Creator Image */}
                {artist.portfolio_images && artist.portfolio_images[0] && (
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={artist.portfolio_images[0]}
                      alt={artist.stage_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Freelancer/Creator Info */}
                <div>
                  <h3 className="font-semibold text-lg">{artist.stage_name}</h3>
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

                {/* Stats */}
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

                {/* Pricing */}
                <div className="text-lg font-semibold text-brand-primary">{rateRange}</div>

                {/* Description */}
                {artist.description && (
                  <div>
                    <h4 className="font-medium mb-2">About</h4>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {artist.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ searchParams }: BookingCreatePageProps) {
  const resolvedSearchParams = await searchParams
  const artistId = resolvedSearchParams.artist

  if (!artistId) {
    return {
      title: 'Book Freelancer/Creator - Theglocal',
    }
  }

  const supabase = await createClient()
  const { data: artist } = await supabase
    .from('artists')
    .select('stage_name, service_category')
    .eq('id', artistId)
    .single()

  if (!artist) {
    return {
      title: 'Freelancer/Creator Not Found - Theglocal',
    }
  }

  return {
    title: `Book ${artist.stage_name} - ${artist.service_category} - Theglocal`,
    description: `Book ${artist.stage_name} for your event on Theglocal`,
  }
}
