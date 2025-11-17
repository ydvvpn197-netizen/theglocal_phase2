import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

export const GET = withRateLimit(async function GET() {
  const logger = createAPILogger('GET', '/api/notifications/summary')
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use atomic RPC function for consistent snapshot
    // Prevents stale counts during concurrent inserts
    const { data: result, error: rpcError } = await supabase
      .rpc('get_notification_summary_atomic', {
        p_user_id: user.id,
      })
      .single<{
        unread_count: number
        latest_id: string | null
        latest_created_at: string | null
      }>()

    if (rpcError) {
      logger.error(
        'Error fetching notification summary:',
        rpcError instanceof Error ? rpcError : undefined
      )
      return NextResponse.json(
        {
          error: 'Failed to fetch notification summary',
          details: rpcError.message,
        },
        { status: 500 }
      )
    }

    // Transform result to match expected format
    const summary = {
      unreadCount: result?.unread_count ?? 0,
      latestNotification: result?.latest_id
        ? {
            id: result.latest_id,
            created_at: result.latest_created_at,
          }
        : null,
    }

    return NextResponse.json(summary)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/notifications/summary',
    })
  }
})
