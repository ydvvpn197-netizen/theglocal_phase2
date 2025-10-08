import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPaymentSignature } from '@/lib/integrations/razorpay'
import { z } from 'zod'

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
})

// POST /api/artists/[id]/subscribe/verify - Verify payment and activate subscription
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifySchema.parse(body)

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('subscription_orders')
      .select('*')
      .eq('order_id', razorpay_order_id)
      .eq('artist_id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status
    await supabase
      .from('subscription_orders')
      .update({
        payment_id: razorpay_payment_id,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('order_id', razorpay_order_id)

    // Calculate trial end date (30 days from now)
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 30)

    // Update artist subscription status
    const { error: artistError } = await supabase
      .from('artists')
      .update({
        subscription_status: 'trial',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: trialEndDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
      })
      .eq('id', params.id)

    if (artistError) {
      console.error('Error updating artist subscription:', artistError)
      return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
    }

    // Create subscription record
    const { error: subscriptionError } = await supabase.from('subscriptions').insert({
      artist_id: params.id,
      user_id: user.id,
      plan: order.plan,
      status: 'trial',
      amount: order.amount,
      currency: order.currency,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      trial_start: new Date().toISOString(),
      trial_end: trialEndDate.toISOString(),
    })

    if (subscriptionError) {
      console.error('Error creating subscription record:', subscriptionError)
      // Continue anyway, artist is activated
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        status: 'trial',
        trial_end: trialEndDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      },
      { status: 500 }
    )
  }
}
