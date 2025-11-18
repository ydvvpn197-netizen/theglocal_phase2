import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getNotificationSummary } from '@/lib/server/notifications'
import { handleAPIError } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/notifications/unread-count - Legacy endpoint for unread count only
export const GET = withRateLimit(async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getNotificationSummary(supabase, user.id)

    return NextResponse.json({ count: summary.unreadCount })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/notifications/unread-count',
    })
  }
})
