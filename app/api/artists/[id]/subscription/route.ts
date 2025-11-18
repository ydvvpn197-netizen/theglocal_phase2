import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
} from '@/lib/integrations/razorpay'
import { cancelPayPalSubscription } from '@/lib/integrations/paypal'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/artists/[id]/subscription - Get subscription details
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/artists/[id]/subscription')
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Verify artist ownership
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (artistError || !artist) {
      throw APIErrors.notFound('Artist profile')
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('artist_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      throw subscriptionError
    }

    if (!subscription) {
      return createSuccessResponse({
        status: artist.subscription_status || 'none',
        subscription: null,
      })
    }

    // Get payment history
    const { data: orders } = await supabase
      .from('subscription_orders')
      .select('*')
      .eq('artist_id', id)
      .order('created_at', { ascending: false })

    return createSuccessResponse({
      status: artist.subscription_status,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        razorpay_subscription_id: subscription.razorpay_subscription_id,
        paypal_subscription_id: subscription.paypal_subscription_id,
        payment_method: subscription.payment_method,
        trial_start: subscription.trial_start,
        trial_end: subscription.trial_end,
        current_start: subscription.current_start,
        current_end: subscription.current_end,
        next_billing_date: subscription.next_billing_date,
        created_at: subscription.created_at,
      },
      artist: {
        subscription_start_date: artist.subscription_start_date,
        subscription_end_date: artist.subscription_end_date,
        trial_end_date: artist.trial_end_date,
        subscription_cancelled_at: artist.subscription_cancelled_at,
      },
      payment_history: orders || [],
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/artists/${errorId}/subscription`,
    })
  }
})

// PATCH /api/artists/[id]/subscription - Manage subscription (pause/resume/cancel)
export const PATCH = withRateLimit(async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('PATCH', '/api/artists/[id]/subscription')
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Verify artist ownership
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (artistError || !artist) {
      throw APIErrors.notFound('Artist profile')
    }

    const body = await _request.json()
    const { action } = body

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      throw APIErrors.badRequest('Invalid action')
    }

    // Get subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('artist_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subscriptionError || !subscription) {
      throw APIErrors.notFound('Subscription')
    }

    // Check if subscription has a valid payment gateway ID
    const hasRazorpayId = subscription.razorpay_subscription_id
    const hasPayPalId = subscription.paypal_subscription_id
    const paymentMethod = subscription.payment_method || 'razorpay'

    if (!hasRazorpayId && !hasPayPalId) {
      throw APIErrors.notFound('Subscription ID')
    }

    let result
    let newStatus

    switch (action) {
      case 'pause':
        if (paymentMethod === 'razorpay' && hasRazorpayId) {
          result = await pauseSubscription(subscription.razorpay_subscription_id, 0)
        } else if (paymentMethod === 'paypal' && hasPayPalId) {
          // PayPal doesn't support pause, we'll just update the database
          result = { status: 'paused' }
        } else {
          throw APIErrors.badRequest('Invalid payment method for pause action')
        }
        newStatus = 'paused'
        await supabase
          .from('subscriptions')
          .update({
            status: 'paused',
            paused_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)
        break

      case 'resume':
        if (paymentMethod === 'razorpay' && hasRazorpayId) {
          result = await resumeSubscription(subscription.razorpay_subscription_id)
        } else if (paymentMethod === 'paypal' && hasPayPalId) {
          // PayPal doesn't support resume, we'll just update the database
          result = { status: 'active' }
        } else {
          throw APIErrors.badRequest('Invalid payment method for resume action')
        }
        newStatus = 'active'
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            resumed_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)
        await supabase.from('artists').update({ subscription_status: 'active' }).eq('id', id)
        break

      case 'cancel':
        if (paymentMethod === 'razorpay' && hasRazorpayId) {
          result = await cancelSubscription(subscription.razorpay_subscription_id)
        } else if (paymentMethod === 'paypal' && hasPayPalId) {
          result = await cancelPayPalSubscription(subscription.paypal_subscription_id)
        } else {
          throw APIErrors.badRequest('Invalid payment method for cancel action')
        }
        newStatus = 'cancelled'
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)
        await supabase
          .from('artists')
          .update({
            subscription_status: 'cancelled',
            subscription_cancelled_at: new Date().toISOString(),
          })
          .eq('id', id)
        break
    }

    return createSuccessResponse(
      {
        status: newStatus,
        subscription: result,
      },
      {
        message: `Subscription ${action}d successfully`,
      }
    )
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'PATCH',
      path: `/api/artists/${errorId}/subscription`,
    })
  }
})
