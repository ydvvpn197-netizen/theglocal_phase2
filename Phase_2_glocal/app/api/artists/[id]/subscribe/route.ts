import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrder } from '@/lib/integrations/razorpay'
import { z } from 'zod'

const subscribeSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
})

// POST /api/artists/[id]/subscribe - Create subscription order
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

    // Get artist profile
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 })
    }

    // Check if already subscribed
    if (artist.subscription_status === 'active') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
    }

    const body = await request.json()
    const { plan } = subscribeSchema.parse(body)

    // Calculate amount (₹500 for monthly, ₹5000 for yearly)
    const amount = plan === 'monthly' ? 50000 : 500000 // Amount in paise
    const currency = 'INR'

    // Create Razorpay order
    const order = await createOrder({
      amount,
      currency,
      receipt: `artist_${artist.id}_${Date.now()}`,
      notes: {
        artist_id: artist.id,
        user_id: user.id,
        plan,
        type: 'subscription_trial',
      },
    })

    // Store order details in database for verification
    const { error: orderError } = await supabase.from('subscription_orders').insert({
      order_id: order.id,
      artist_id: artist.id,
      user_id: user.id,
      amount,
      currency,
      plan,
      status: 'created',
    })

    if (orderError) {
      console.error('Error storing order:', orderError)
      // Continue anyway, order is created in Razorpay
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        customer_name: artist.stage_name,
        customer_email: user.email,
      },
    })
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      },
      { status: 500 }
    )
  }
}
