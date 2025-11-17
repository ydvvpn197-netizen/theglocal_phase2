import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/cron/send-event-reminders - Cron job to send event reminders
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/cron/send-event-reminders')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    const supabase = await createClient()

    // Call database function to send event reminders
    const { data: remindersSent, error } = await supabase.rpc('send_event_reminders')

    if (error) {
      logger.error('Error sending event reminders', error)
      return NextResponse.json(
        {
          error: 'Failed to send event reminders',
          message: error.message,
        },
        { status: 500 }
      )
    }

    logger.info('Event reminders cron completed', { remindersSent: remindersSent || 0 })

    return createSuccessResponse(
      {
        reminders_sent: remindersSent || 0,
      },
      {
        message: 'Event reminders cron job completed successfully',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/cron/send-event-reminders',
    })
  }
}) // Cron jobs use CRON preset automatically
