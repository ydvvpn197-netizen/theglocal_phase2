import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionStats } from '@/components/admin/subscription-stats'
import { SubscriptionList } from '@/components/admin/subscription-list'

export const metadata = {
  title: 'Subscription Analytics | Admin | Theglocal',
  description: 'View subscription analytics and manage subscriptions',
}

async function getSubscriptionData() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/subscriptions`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Check if user is super admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.is_super_admin) {
    redirect('/')
  }

  // Get subscription data
  const subscriptionData = (await getSubscriptionData()) as {
    success: boolean
    data: {
      analytics: {
        totalSubscriptions: number
        activeSubscriptions: number
        trialSubscriptions: number
        cancelledSubscriptions: number
        mrr: number
        churnRate: number
        trialConversionRate: number
        failedPayments: number
        revenueByPlan: { monthly: number; yearly: number }
      }
      subscriptions: Array<{
        id: string
        artist_id: string
        user_id: string
        razorpay_subscription_id: string | null
        razorpay_plan_id: string | null
        plan: string
        status: string
        amount: number
        currency: string
        trial_start: string | null
        trial_end: string | null
        current_start: string | null
        current_end: string | null
        next_billing_date: string | null
        created_at: string
        artist: {
          id: string
          stage_name: string
          service_category: string
          location_city: string
        }
        user: {
          id: string
          email: string
          anonymous_handle: string
        }
      }>
    }
  } | null

  if (!subscriptionData || !subscriptionData.success) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Subscription Analytics</h1>
        <p className="text-muted-foreground">
          Unable to load subscription data. Please try again later.
        </p>
      </div>
    )
  }

  const { analytics, subscriptions } = subscriptionData.data

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Analytics</h1>
        <p className="text-muted-foreground">
          Monitor subscription metrics, revenue, and manage all artist subscriptions
        </p>
      </div>

      <div className="space-y-6">
        {/* Analytics Stats */}
        <SubscriptionStats analytics={analytics} />

        {/* Subscriptions List */}
        <SubscriptionList subscriptions={subscriptions} />
      </div>
    </div>
  )
}
