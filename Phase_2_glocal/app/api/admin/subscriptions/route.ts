import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Force dynamic rendering for this route since it uses cookies for auth
export const dynamic = 'force-dynamic'

// GET /api/admin/subscriptions - Get subscription analytics and list
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/admin/subscriptions')
  try {
    // Require admin authentication
    const { supabase } = await requireAdminOrThrow()

    // Get query parameters
    const { searchParams } = new URL(_request.url)
    const status = searchParams.get('status')
    const plan = searchParams.get('plan')

    // Build query for subscriptions list
    let subscriptionsQuery = supabase
      .from('subscriptions')
      .select(
        `
        *,
        artist:artists(
          id,
          stage_name,
          service_category,
          location_city
        ),
        user:users(
          id,
          email,
          anonymous_handle
        )
      `
      )
      .order('created_at', { ascending: false })

    if (status) {
      subscriptionsQuery = subscriptionsQuery.eq('status', status)
    }
    if (plan) {
      subscriptionsQuery = subscriptionsQuery.eq('plan', plan)
    }

    const { data: subscriptions, error: subscriptionsError } = await subscriptionsQuery

    if (subscriptionsError) {
      logger.error(
        'Error fetching subscriptions:',
        subscriptionsError instanceof Error ? subscriptionsError : undefined
      )
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    // Calculate analytics
    const activeSubscriptions =
      subscriptions?.filter((s) => ['active', 'trial'].includes(s.status)).length || 0

    const trialSubscriptions = subscriptions?.filter((s) => s.status === 'trial').length || 0

    const cancelledSubscriptions =
      subscriptions?.filter((s) => s.status === 'cancelled').length || 0

    // Calculate MRR (Monthly Recurring Revenue)
    const monthlyRevenue =
      subscriptions
        ?.filter((s) => ['active', 'trial'].includes(s.status) && s.plan === 'monthly')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0

    const yearlyRevenue =
      subscriptions
        ?.filter((s) => ['active', 'trial'].includes(s.status) && s.plan === 'yearly')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0

    // Convert yearly to monthly equivalent for MRR
    const mrr = monthlyRevenue + yearlyRevenue / 12

    // Calculate churn rate (cancelled / total active in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSubscriptions =
      subscriptions?.filter((s) => new Date(s.created_at) >= thirtyDaysAgo) || []

    const recentCancellations = recentSubscriptions.filter((s) => s.status === 'cancelled').length

    const churnRate =
      recentSubscriptions.length > 0
        ? ((recentCancellations / recentSubscriptions.length) * 100).toFixed(2)
        : '0'

    // Calculate trial conversion rate
    const completedTrials =
      subscriptions?.filter((s) => s.trial_end && new Date(s.trial_end) < new Date()) || []

    const convertedTrials = completedTrials.filter((s) => s.status === 'active').length

    const trialConversionRate =
      completedTrials.length > 0
        ? ((convertedTrials / completedTrials.length) * 100).toFixed(2)
        : '0'

    // Revenue by plan
    const monthlyPlanRevenue =
      subscriptions
        ?.filter((s) => ['active', 'trial'].includes(s.status) && s.plan === 'monthly')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0

    const yearlyPlanRevenue =
      subscriptions
        ?.filter((s) => ['active', 'trial'].includes(s.status) && s.plan === 'yearly')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0

    // Get payment orders for failed payment tracking
    const { data: orders } = await supabase
      .from('subscription_orders')
      .select('*')
      .eq('status', 'failed')

    const failedPayments = orders?.length || 0

    return NextResponse.json({
      success: true,
      data: {
        analytics: {
          totalSubscriptions: subscriptions?.length || 0,
          activeSubscriptions,
          trialSubscriptions,
          cancelledSubscriptions,
          mrr: Math.round(mrr / 100), // Convert paise to rupees
          churnRate: parseFloat(churnRate),
          trialConversionRate: parseFloat(trialConversionRate),
          failedPayments,
          revenueByPlan: {
            monthly: Math.round(monthlyPlanRevenue / 100),
            yearly: Math.round(yearlyPlanRevenue / 100),
          },
        },
        subscriptions: subscriptions || [],
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/admin/subscriptions' })
  }
})
