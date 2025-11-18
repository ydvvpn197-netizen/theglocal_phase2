import { logger } from '@/lib/utils/logger'
import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Star, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { ArtistProfileActions } from '@/components/artists/artist-profile-actions'
import { EventOwnerInlineActions } from '@/components/events/event-owner-inline-actions'
import { BookingSection } from '@/components/artists/booking-section'
import { ImageWithFallback } from '@/components/ui/image-with-fallback'
import { Suspense } from 'react'
import { Separator } from '@/components/ui/separator'

interface ArtistProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  try {
    const supabase = await createClient()

    // Destructure id from params (Next.js 15 async params)
    const { id } = await params

    // Get current user first to check ownership
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // For pending artists, always use admin client to bypass RLS issues
    let { data: artist, error } = await supabase.from('artists').select('*').eq('id', id).single()

    // If the regular client fails, try with admin client (especially for pending artists)
    if (error || !artist) {
      logger.info('[Artist Profile] Regular client failed, trying admin client')
      const adminSupabase = createAdminClient()

      const adminResult = await adminSupabase.from('artists').select('*').eq('id', id).single()

      if (adminResult.data) {
        artist = adminResult.data
        error = null
        logger.info('[Artist Profile] Admin client successfully fetched artist profile')
      } else {
        logger.error('[Artist Profile] Admin client also failed:', adminResult.error)
      }
    }

    if (error || !artist) {
      logger.error('[Artist Profile] Error fetching artist:', error)

      // If user is trying to access their own profile but it's blocked by RLS,
      // this might be a pending verification issue
      if (user?.id === id) {
        logger.error(
          '[Artist Profile] User trying to access own pending profile but blocked by RLS'
        )
        return (
          <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Profile Verification Pending</h1>
              <p className="text-muted-foreground">
                Your artist profile is pending verification. Please complete your subscription to
                make your profile public.
              </p>
            </div>
          </div>
        )
      }

      notFound()
    }

    const isOwner = user?.id === artist.id

    // Check if this is a pending artist and user is not the owner
    if (artist.verification_status === 'pending' && !isOwner) {
      logger.info('[Artist Profile] Pending artist accessed by non-owner, redirecting to 404')
      notFound()
    }

    // Increment profile view count only if user is owner or artist is verified
    if (isOwner || artist.verification_status === 'verified') {
      await supabase
        .from('artists')
        .update({ profile_views: (artist.profile_views || 0) + 1 })
        .eq('id', id)
    }

    // Fetch artist's upcoming events
    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date, rsvp_count')
      .eq('artist_id', id)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10)

    type EventRow = {
      id: string
      title: string
      event_date: string
      rsvp_count: number | null
    }

    const upcomingEvents: EventRow[] = (events as EventRow[] | null) ?? []

    const rateRange =
      artist.rate_min && artist.rate_max
        ? `₹${artist.rate_min.toLocaleString()} - ₹${artist.rate_max.toLocaleString()}`
        : 'Contact for pricing'

    const showPortfolio =
      artist.portfolio_images &&
      artist.portfolio_images.length > 0 &&
      artist.portfolio_images.some((img: string | null) => img !== null)
    const showEvents = upcomingEvents.length > 0
    const showAbout = Boolean(artist.description)
    const showAdditionalSections = showAbout || showPortfolio || showEvents

    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Card className="overflow-hidden border border-border/60 shadow-xl">
          <div className="px-6 pb-8 pt-0">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-8 rounded-3xl bg-background p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl">
                      <ImageWithFallback
                        src={artist.portfolio_images?.[0] || '/placeholder-artist.svg'}
                        alt={artist.stage_name}
                        fill
                        className="object-cover"
                        unoptimized={
                          !artist.portfolio_images?.[0] ||
                          artist.portfolio_images[0]?.endsWith('.svg')
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-4">
                            <h1 className="text-3xl font-bold leading-tight">
                              {artist.stage_name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="capitalize">
                                {artist.service_category.replace('_', ' ')}
                              </Badge>
                              {artist.verification_status && (
                                <Badge
                                  variant={
                                    artist.verification_status === 'verified'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="capitalize"
                                >
                                  {artist.verification_status === 'verified'
                                    ? '✓ Verified'
                                    : '⏳ Pending'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <ArtistProfileActions
                              artistId={id}
                              stageName={artist.stage_name}
                              isOwner={isOwner}
                              currentCity={artist.location_city}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {artist.location_city}
                          </span>
                          <span className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            New Artist
                          </span>
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {(artist.profile_views || 0).toLocaleString()} views
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-2xl font-semibold text-brand-primary">
                          <DollarSign className="h-5 w-5" />
                          {rateRange}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full max-w-full lg:max-w-xs">
                    <Suspense
                      fallback={
                        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 p-4">
                          <div className="space-y-3">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-10 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      }
                    >
                      <BookingSection
                        artistId={id}
                        artistName={artist.stage_name}
                        profileViews={artist.profile_views || 0}
                        createdAt={artist.created_at}
                        subscriptionStatus={artist.subscription_status}
                        verificationStatus={artist.verification_status}
                        isOwner={isOwner}
                      />
                    </Suspense>
                  </div>
                </div>

                {showAdditionalSections && <Separator />}

                {showAdditionalSections && (
                  <div className="space-y-6">
                    {showAbout && (
                      <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">About</h2>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground md:text-base">
                          {artist.description}
                        </p>
                      </section>
                    )}

                    {(showPortfolio || showEvents) && (
                      <div className="grid gap-6 lg:grid-cols-3">
                        {showPortfolio && (
                          <section className="rounded-2xl bg-background/80 p-5 lg:col-span-2">
                            <div className="mb-4 flex items-center justify-between gap-2">
                              <h2 className="text-lg font-semibold tracking-tight">Portfolio</h2>
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                Showcase
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                              {artist.portfolio_images
                                .filter((url: string | null) => url !== null)
                                .map((url: string, index: number) => (
                                  <div
                                    key={`${url}-${index}`}
                                    className="relative aspect-square overflow-hidden rounded-xl border border-border/60"
                                  >
                                    <ImageWithFallback
                                      src={url}
                                      alt={`Portfolio ${index + 1}`}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                            </div>
                          </section>
                        )}

                        {showEvents && (
                          <section className="rounded-2xl bg-background/80 p-5">
                            <div className="mb-4 flex items-center justify-between gap-2">
                              <h2 className="text-lg font-semibold tracking-tight">
                                Upcoming Events
                              </h2>
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                {upcomingEvents.length} planned
                              </span>
                            </div>
                            <div className="space-y-4">
                              {upcomingEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/60"
                                >
                                  <Link
                                    href={`/events/${event.id}`}
                                    className="flex flex-1 items-start gap-3"
                                  >
                                    <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">{event.title}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {new Date(event.event_date).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </Link>
                                  {isOwner && (
                                    <EventOwnerInlineActions
                                      eventId={event.id}
                                      eventTitle={event.title}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  } catch (error) {
    logger.error('[Artist Profile] Unexpected error:', error)
    notFound()
  }
}

export async function generateMetadata({ params }: ArtistProfilePageProps) {
  const supabase = await createClient()

  // Destructure id from params (Next.js 15 async params)
  const { id } = await params

  const { data: artist } = await supabase
    .from('artists')
    .select('stage_name, description, service_category')
    .eq('id', id)
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
