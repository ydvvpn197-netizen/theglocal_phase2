import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, WebhookEvent } from '@/lib/integrations/razorpay'

// POST /api/artists/subscription-webhook - Handle Razorpay webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      console.error('Webhook signature missing')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature for security
    const isValidSignature = verifyWebhookSignature(body, signature)

    if (!isValidSignature) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event: WebhookEvent = JSON.parse(body)
    const supabase = await createClient()

    console.log('Processing webhook event:', event.event)

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event, supabase)
        break

      case 'payment.failed':
        await handlePaymentFailed(event, supabase)
        break

      case 'subscription.activated':
        await handleSubscriptionActivated(event, supabase)
        break

      case 'subscription.charged':
        await handleSubscriptionCharged(event, supabase)
        break

      case 'subscription.completed':
        await handleSubscriptionCompleted(event, supabase)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event, supabase)
        break

      case 'subscription.paused':
        await handleSubscriptionPaused(event, supabase)
        break

      case 'subscription.resumed':
        await handleSubscriptionResumed(event, supabase)
        break

      default:
        console.log('Unhandled webhook event:', event.event)
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

async function handlePaymentCaptured(
  event: WebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const payment = event.payload.payment
  if (!payment) return

  console.log('Payment captured:', payment.id)

  // Update subscription order status
  await supabase
    .from('subscription_orders')
    .update({
      status: 'paid',
      payment_id: payment.id,
      paid_at: new Date().toISOString(),
    })
    .eq('payment_id', payment.id)
}

async function handlePaymentFailed(event: WebhookEvent, supabase: any) {
  const payment = event.payload.payment
  if (!payment) return

  console.log('Payment failed:', payment.id)

  // Update subscription order status
  await supabase
    .from('subscription_orders')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
    })
    .eq('payment_id', payment.id)
}

async function handleSubscriptionActivated(event: WebhookEvent, supabase: any) {
  const subscription = event.payload.subscription
  if (!subscription) return

  console.log('Subscription activated:', subscription.id)

  // Find artist by subscription
  const { data: subscriptionRecord } = await supabase
    .from('subscriptions')
    .select('artist_id')
    .eq('razorpay_subscription_id', subscription.id)
    .single()

  if (subscriptionRecord) {
    // Update artist subscription status
    await supabase
      .from('artists')
      .update({
        subscription_status: 'active',
        subscription_start_date: new Date(subscription.current_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_end * 1000).toISOString(),
      })
      .eq('id', subscriptionRecord.artist_id)
  }
}

async function handleSubscriptionCharged(
  event: WebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const subscription = event.payload.subscription
  if (!subscription) return

  console.log('Subscription charged:', subscription.id)

  // Update subscription record with new billing cycle
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_start: new Date(subscription.current_start * 1000).toISOString(),
      current_end: new Date(subscription.current_end * 1000).toISOString(),
      last_charged: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}

async function handleSubscriptionCompleted(
  event: WebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const subscription = event.payload.subscription
  if (!subscription) return

  console.log('Subscription completed:', subscription.id)

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}

async function handleSubscriptionCancelled(
  event: WebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const subscription = event.payload.subscription
  if (!subscription) return

  console.log('Subscription cancelled:', subscription.id)

  // Find artist by subscription
  const { data: subscriptionRecord } = await supabase
    .from('subscriptions')
    .select('artist_id')
    .eq('razorpay_subscription_id', subscription.id)
    .single()

  if (subscriptionRecord) {
    // Update artist subscription status to cancelled
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
      .eq('razorpay_subscription_id', subscription.id)
  }
}

async function handleSubscriptionPaused(
  event: WebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const subscription = event.payload.subscription
  if (!subscription) return

  console.log('Subscription paused:', subscription.id)

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}

async function handleSubscriptionResumed(
  event: WebhookEvent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const subscription = event.payload.subscription
  if (!subscription) return

  console.log('Subscription resumed:', subscription.id)

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      resumed_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}
