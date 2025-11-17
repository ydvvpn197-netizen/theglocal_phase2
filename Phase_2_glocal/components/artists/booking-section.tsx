'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, CreditCard } from 'lucide-react'
import Link from 'next/link'
import BookingDialog from '@/components/bookings/booking-dialog'

interface BookingSectionProps {
  artistId: string
  artistName: string
  profileViews: number
  createdAt: string
  subscriptionStatus: string
  verificationStatus?: string
  isOwner?: boolean
}

export function BookingSection({
  artistId,
  artistName,
  profileViews,
  createdAt,
  subscriptionStatus,
  verificationStatus,
  isOwner = false,
}: BookingSectionProps) {
  // Show different UI for pending verification artists
  const isPendingVerification = verificationStatus === 'pending'
  const panelBase =
    'rounded-2xl border border-border/60 bg-background/95 p-5 shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60'
  const statsPanel =
    'rounded-2xl border border-border/60 bg-muted/20 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/40'

  // For verified artists, wrap the entire card with BookingDialog
  const verifiedArtistCard = (
    <BookingDialog artistId={artistId} artistName={artistName}>
      <div
        className={`${panelBase} cursor-pointer hover:border-brand-primary/60 hover:shadow-lg focus-visible:ring-offset-2`}
        role="button"
        tabIndex={0}
        aria-label={`Request a booking with ${artistName}`}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Book This Freelancer/Creator</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a booking request with your event details.
            </p>
          </div>
          <Button className="w-full">
            <MessageSquare className="mr-2 h-4 w-4" />
            Request Booking
          </Button>
        </div>
      </div>
    </BookingDialog>
  )

  return (
    <div className="space-y-4">
      {isPendingVerification && isOwner ? (
        <div className={`${panelBase} border-dashed`}>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold tracking-tight">Bookings Locked</h3>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <strong>Verification pending.</strong> Complete your subscription to enable bookings
              on your profile.
            </p>
            <Link href={`/artists/${artistId}/subscribe`} className="block">
              <Button className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Complete Subscription & Verify Profile
              </Button>
            </Link>
          </div>
        </div>
      ) : isPendingVerification && !isOwner ? (
        <div className={`${panelBase} border-dashed`}>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold tracking-tight">
              Bookings Temporarily Unavailable
            </h3>
            <p className="text-sm text-muted-foreground">
              This freelancer/creator profile is pending verification.
            </p>
            <Button className="w-full" disabled variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Bookings Temporarily Unavailable
            </Button>
          </div>
        </div>
      ) : isOwner && !isPendingVerification ? (
        <div className={panelBase}>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Bookings Visible to Visitors</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Guests see a request button here. Use your dashboard to respond to booking requests.
              </p>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/bookings">Manage Bookings</Link>
            </Button>
          </div>
        </div>
      ) : (
        verifiedArtistCard
      )}

      <div className={statsPanel}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Profile Stats
          </h3>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Profile Views</span>
            <span className="font-semibold">{profileViews.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Joined</span>
            <span className="font-semibold">{new Date(createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subscription</span>
            <Badge variant="secondary" className="capitalize text-xs">
              {subscriptionStatus}
            </Badge>
          </div>
          {verificationStatus && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Verification</span>
              {isPendingVerification && isOwner ? (
                <Link href={`/artists/${artistId}/subscribe`} className="inline-block">
                  <Badge
                    variant="secondary"
                    className="cursor-pointer text-xs capitalize transition-colors hover:bg-secondary/80"
                  >
                    {verificationStatus} · Verify now
                  </Badge>
                </Link>
              ) : (
                <Badge
                  variant={verificationStatus === 'verified' ? 'default' : 'secondary'}
                  className="text-xs capitalize"
                >
                  {verificationStatus}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
