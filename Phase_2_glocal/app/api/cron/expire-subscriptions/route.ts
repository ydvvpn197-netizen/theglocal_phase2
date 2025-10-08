import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/cron/expire-subscriptions - Cron job to expire subscriptions and hide profiles
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Call the function to update expired subscriptions
    const { data: expiredData, error: expiredError } = await supabase.rpc(
      'update_expired_subscriptions'
    )

    if (expiredError) {
      console.error('Error updating expired subscriptions:', expiredError)
      throw expiredError
    }

    // Call the function to hide profiles past grace period
    const { data: hiddenData, error: hiddenError } = await supabase.rpc(
      'hide_expired_artist_profiles'
    )

    if (hiddenError) {
      console.error('Error hiding expired profiles:', hiddenError)
      throw hiddenError
    }

    console.log(`Cron job completed: ${expiredData || 0} expired, ${hiddenData || 0} hidden`)

    return NextResponse.json({
      success: true,
      expired_count: expiredData || 0,
      hidden_count: hiddenData || 0,
      message: 'Subscription expiry cron job completed successfully',
    })
  } catch (error) {
    console.error('Subscription expiry cron job error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

