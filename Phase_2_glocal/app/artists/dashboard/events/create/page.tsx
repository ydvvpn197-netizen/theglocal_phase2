import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateEventForm } from '@/components/events/create-event-form'
import { AlertCircle } from 'lucide-react'

export default async function CreateEventPage() {
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
    .select('id, stage_name, subscription_status, subscription_end_date')
    .eq('user_id', user.id)
    .single()

  if (!artist) {
    redirect('/artists/register')
  }

  // Check if artist has active subscription
  const hasActiveSubscription = ['trial', 'active'].includes(artist.subscription_status)

  if (!hasActiveSubscription) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Subscription Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You need an active subscription to create events. Your subscription has expired.</p>
            <p>
              Please renew your subscription to continue creating events and receiving booking
              requests.
            </p>
            <a
              href="/artists/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
            >
              Renew Subscription
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Create Event</h1>
          <p className="mt-2 text-muted-foreground">
            Share your upcoming event with the local community
          </p>
        </div>

        {/* Event Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateEventForm artistName={artist.stage_name} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Create Event - Theglocal',
  description: 'Create a new event for your audience',
}
