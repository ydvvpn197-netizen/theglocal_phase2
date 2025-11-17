import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPayPalSubscription } from '@/lib/integrations/paypal'
import { z } from 'zod'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

const verifyPayPalSchema = z.object({
  subscription_id: z.string(),
})

// POST /api/artists/[id]/subscribe/verify-paypal - Verify PayPal subscription
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('POST', '/api/artists/[id]/subscribe/verify-paypal')
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

    // Get artist profile
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single()

    if (artistError || !artist) {
      throw APIErrors.notFound('Artist profile')
    }

    // Verify ownership
    if (artist.user_id !== user.id) {
      throw APIErrors.forbidden()
    }

    const body = await _request.json()
    const { subscription_id } = verifyPayPalSchema.parse(body)

    // Get PayPal subscription details
    const paypalSubscription = await getPayPalSubscription(subscription_id)

    // Check if subscription is active/approved
    if (paypalSubscription.status !== 'ACTIVE' && paypalSubscription.status !== 'APPROVED') {
      throw APIErrors.badRequest('Subscription is not active')
    }

    // Update subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_start: new Date().toISOString(),
        current_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        last_charged: new Date().toISOString(),
      })
      .eq('paypal_subscription_id', subscription_id)
      .eq('artist_id', artist.id)

    if (subscriptionError) {
      logger.error(
        'Error updating subscription:',
        subscriptionError instanceof Error ? subscriptionError : undefined
      )
      throw subscriptionError
    }

    // Update artist subscription status
    const { error: updateError } = await supabase
      .from('artists')
      .update({
        subscription_status: 'active',
        verification_status: 'verified',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', artist.id)

    if (updateError) {
      logger.error('Error updating artist:', updateError instanceof Error ? updateError : undefined)
      throw updateError
    }

    return createSuccessResponse(null, {
      message: 'Subscription activated successfully',
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/artists/${errorId}/subscribe/verify-paypal`,
    })
  }
})
