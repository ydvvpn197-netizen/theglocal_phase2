import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Calendar, BarChart3, Settings, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function ArtistWelcomePage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Get artist profile
  const { data: artist, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !artist) {
    notFound()
  }

  // Calculate trial end date
  const trialEndDate = artist.trial_end_date
    ? new Date(artist.trial_end_date)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Success Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Theglocal!</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Your artist profile is now active and ready to connect with your community
          </p>
        </div>

        {/* Trial Status Card */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Star className="h-5 w-5" />
              Free Trial Active
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                30 Days Free
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-green-700">
                <strong>Trial ends:</strong> {formatDate(trialEndDate)}
              </p>
              <p className="text-sm text-green-600">
                Your card has been saved but won't be charged until your trial ends. You can cancel
                anytime before {formatDate(trialEndDate)} to avoid charges.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Get Started - Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10">
                    <Calendar className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create Your First Event</h3>
                    <p className="text-sm text-muted-foreground">
                      Start by creating an event to showcase your talent and attract bookings
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10">
                    <Settings className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Complete Your Profile</h3>
                    <p className="text-sm text-muted-foreground">
                      Add more details, update your portfolio, and optimize your profile
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10">
                    <BarChart3 className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Explore Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your profile views, booking requests, and performance metrics
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10">
                    <Check className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Manage Bookings</h3>
                    <p className="text-sm text-muted-foreground">
                      Respond to booking requests and manage your calendar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What You Get */}
        <Card>
          <CardHeader>
            <CardTitle>What You Get with Your Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex gap-2">
                <Check className="h-5 w-5 text-brand-primary" />
                <span className="text-sm">Create unlimited events</span>
              </div>
              <div className="flex gap-2">
                <Check className="h-5 w-5 text-brand-primary" />
                <span className="text-sm">Receive booking requests</span>
              </div>
              <div className="flex gap-2">
                <Check className="h-5 w-5 text-brand-primary" />
                <span className="text-sm">Portfolio showcase (10 images)</span>
              </div>
              <div className="flex gap-2">
                <Check className="h-5 w-5 text-brand-primary" />
                <span className="text-sm">Profile analytics</span>
              </div>
              <div className="flex gap-2">
                <Check className="h-5 w-5 text-brand-primary" />
                <span className="text-sm">Featured in local discovery</span>
              </div>
              <div className="flex gap-2">
                <Check className="h-5 w-5 text-brand-primary" />
                <span className="text-sm">Direct messaging with clients</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="flex-1">
            <Link href="/artists/dashboard">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/artists/dashboard/events/create">Create First Event</Link>
          </Button>
        </div>

        {/* Help Section */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-blue-800">Need Help Getting Started?</h3>
              <p className="mt-1 text-sm text-blue-700">
                Check out our guide or contact support if you have any questions
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/help">Help Center</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/contact">Contact Support</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Welcome - Theglocal',
  description: 'Welcome to Theglocal! Your artist profile is now active.',
}
