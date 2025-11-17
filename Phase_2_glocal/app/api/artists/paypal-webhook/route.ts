import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPayPalWebhookSignature } from '@/lib/integrations/paypal'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

interface PayPalWebhookEvent {
  id: string
  event_type: string
  create_time: string
  resource_type: string
  resource: Record<string, unknown>
  summary: string
  links: unknown[]
}

// POST /api/artists/paypal-webhook - Handle PayPal webhooks
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/artists/paypal-webhook')
  try {
    const body = await _request.text()
    const signature = _request.headers.get('paypal-transmission-id')
    const certId = _request.headers.get('paypal-cert-id')
    const authAlgo = _request.headers.get('paypal-auth-algo')
    const transmissionSig = _request.headers.get('paypal-transmission-sig')
    const transmissionTime = _request.headers.get('paypal-transmission-time')

    if (!signature || !certId || !authAlgo || !transmissionSig || !transmissionTime) {
      logger.error('PayPal webhook headers missing')
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 })
    }

    // Verify PayPal webhook signature
    const isValidSignature = verifyPayPalWebhookSignature(
      body,
      transmissionSig,
      process.env.PAYPAL_WEBHOOK_ID || ''
    )

    if (!isValidSignature) {
      logger.error('Invalid PayPal webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event: PayPalWebhookEvent = JSON.parse(body)
    const supabase = await createClient()

    logger.info('Processing PayPal webhook event', { eventType: event.event_type })

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handlePayPalSubscriptionActivated(event, supabase)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handlePayPalSubscriptionCancelled(event, supabase)
        break

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handlePayPalSubscriptionSuspended(event, supabase)
        break

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handlePayPalPaymentFailed(event, supabase)
        break

      case 'PAYMENT.SALE.COMPLETED':
        await handlePayPalPaymentCompleted(event, supabase)
        break

      default:
        logger.info('Unhandled PayPal webhook event', { eventType: event.event_type })
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/artists/paypal-webhook' })
  }
})
async function handlePayPalSubscriptionActivated(
  event: PayPalWebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const logger = createAPILogger('POST', '/api/artists/paypal-webhook')
  interface PayPalSubscription {
    id: string
    [key: string]: unknown
  }
  const subscription = event.resource as PayPalSubscription | undefined
  if (!subscription) return

  logger.info('PayPal subscription activated', { subscriptionId: subscription.id })

  // Find subscription record
  const { data: subscriptionRecord } = await supabase
    .from('subscriptions')
    .select('artist_id')
    .eq('paypal_subscription_id', subscription.id)
    .single()

  if (subscriptionRecord) {
    // Update artist subscription status
    await supabase
      .from('artists')
      .update({
        subscription_status: 'active',
        verification_status: 'verified',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', subscriptionRecord.artist_id)

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_start: new Date().toISOString(),
        current_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('paypal_subscription_id', subscription.id)
  }
}

async function handlePayPalSubscriptionCancelled(
  event: PayPalWebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const logger = createAPILogger('POST', '/api/artists/paypal-webhook')
  interface PayPalSubscription {
    id: string
    [key: string]: unknown
  }
  const subscription = event.resource as PayPalSubscription | undefined
  if (!subscription) return

  logger.info('PayPal subscription cancelled', { subscriptionId: subscription.id })

  // Find subscription record
  const { data: subscriptionRecord } = await supabase
    .from('subscriptions')
    .select('artist_id')
    .eq('paypal_subscription_id', subscription.id)
    .single()

  if (subscriptionRecord) {
    // Update artist subscription status
    await supabase
      .from('artists')
      .update({
        subscription_status: 'cancelled',
        subscription_cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionRecord.artist_id)

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('paypal_subscription_id', subscription.id)
  }
}

async function handlePayPalSubscriptionSuspended(
  event: PayPalWebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const logger = createAPILogger('POST', '/api/artists/paypal-webhook')
  interface PayPalSubscription {
    id: string
    [key: string]: unknown
  }
  const subscription = event.resource as PayPalSubscription | undefined
  if (!subscription) return

  logger.info('PayPal subscription suspended', { subscriptionId: subscription.id })

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscription.id)
}

async function handlePayPalPaymentFailed(
  event: PayPalWebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const logger = createAPILogger('POST', '/api/artists/paypal-webhook')
  interface PayPalSubscription {
    id: string
    [key: string]: unknown
  }
  const subscription = event.resource as PayPalSubscription | undefined
  if (!subscription) return

  logger.info('PayPal payment failed', { subscriptionId: subscription.id })

  // Update subscription with failed payment info
  await supabase
    .from('subscriptions')
    .update({
      status: 'payment_failed',
      last_failed_payment: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscription.id)
}

async function handlePayPalPaymentCompleted(
  event: PayPalWebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const logger = createAPILogger('POST', '/api/artists/paypal-webhook')
  const payment = event.resource as { id?: string; billing_agreement_id?: string } | undefined
  if (!payment || !payment.id) return

  logger.info('PayPal payment completed', { paymentId: payment.id })

  // Update subscription with successful payment
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      last_charged: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', payment.billing_agreement_id || '')
}
