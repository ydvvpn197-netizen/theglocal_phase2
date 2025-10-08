import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionForm } from '@/components/artists/subscription-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Shield } from 'lucide-react'

interface ArtistSubscribePageProps {
  params: { id: string }
}

export default async function ArtistSubscribePage({ params }: ArtistSubscribePageProps) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return notFound()
  }

  // Get artist profile
  const { data: artist, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !artist) {
    return notFound()
  }

  // Check if already subscribed
  if (artist.subscription_status === 'active' || artist.subscription_status === 'trial') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Check className="h-5 w-5" />
              Already Subscribed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              Your subscription is already active. You can manage your subscription from your
              dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Complete Your Artist Subscription</h1>
          <p className="mt-2 text-muted-foreground">
            Activate your profile and start connecting with your community
          </p>
        </div>

        {/* Artist Info */}
        <Card>
          <CardHeader>
            <CardTitle>Artist Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-semibold">{artist.stage_name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {artist.service_category.replace('_', ' ')}
                </p>
                <p className="text-sm text-muted-foreground">{artist.location_city}</p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {artist.subscription_status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Form */}
        <SubscriptionForm artistId={artist.id} />

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>What You Get</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Create unlimited events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Receive booking requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Portfolio showcase (10 images)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Profile analytics</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Featured in local discovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Direct messaging with clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Priority customer support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm">Cancel anytime</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-start gap-3 pt-6">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Secure & Private</p>
              <p className="text-sm text-blue-700">
                Your payment information is processed securely by Razorpay. We never store your card
                details and your data is protected with industry-standard encryption.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Subscribe - Theglocal',
  description: 'Complete your artist subscription to start connecting with your community',
}
