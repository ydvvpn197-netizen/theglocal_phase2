import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionStatusCard } from '@/components/artists/subscription-status-card'
import { SubscriptionActions } from '@/components/artists/subscription-actions'
import { SubscriptionHistory } from '@/components/artists/subscription-history'

export const metadata = {
  title: 'Subscription Management | Theglocal',
  description: 'Manage your artist subscription',
}

async function getSubscriptionData(artistId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/artists/${artistId}/subscription`,
    {
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

export default async function SubscriptionPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get artist profile
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', user.id)
    .single()

  if (artistError || !artist) {
    redirect('/artists/register')
  }

  // Get subscription data
  const subscriptionData = await getSubscriptionData(artist.id)

  if (!subscriptionData || !subscriptionData.success) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>
        <p className="text-muted-foreground">
          Unable to load subscription data. Please try again later.
        </p>
      </div>
    )
  }

  const { status, subscription, artist: artistData, payment_history } = subscriptionData.data

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage your artist subscription, view payment history, and update your plan
        </p>
      </div>

      <div className="space-y-6">
        {/* Subscription Status */}
        <SubscriptionStatusCard
          status={status}
          plan={subscription?.plan}
          amount={subscription?.amount}
          currency={subscription?.currency}
          trialEnd={artistData?.trial_end_date}
          currentEnd={subscription?.current_end}
          nextBillingDate={subscription?.next_billing_date}
          cancelledAt={artistData?.subscription_cancelled_at}
        />

        {/* Subscription Actions */}
        {subscription && (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Manage Subscription</h2>
            <SubscriptionActions artistId={artist.id} subscriptionStatus={status} />
          </div>
        )}

        {/* Payment History */}
        <SubscriptionHistory paymentHistory={payment_history} />
      </div>
    </div>
  )
}
