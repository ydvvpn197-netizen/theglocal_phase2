import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleAPIError, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import type { Notification } from '@/lib/types/notifications'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

const cursorSchema = z.object({
  createdAt: z.string(),
  id: z.string().uuid(),
})

type CursorPayload = z.infer<typeof cursorSchema>

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    return cursorSchema.parse(JSON.parse(decoded))
  } catch {
    return null
  }
}

function satisfiesCursor(row: { created_at: string; id: string }, cursor: CursorPayload): boolean {
  const rowDate = new Date(row.created_at).getTime()
  const cursorDate = new Date(cursor.createdAt).getTime()

  if (rowDate !== cursorDate) {
    return rowDate < cursorDate
  }

  return row.id < cursor.id
}

function matchesFilter(row: Notification, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === 'unread') return !row.is_read
  if (filter === 'read') return row.is_read
  return true
}

function sanitizeNotification(row: Notification): Notification | null {
  if (!row || !row.id) return null
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    actor_id: row.actor_id,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    is_read: row.is_read,
    created_at: row.created_at,
    read_at: row.read_at,
    expires_at: row.expires_at,
    batch_key: row.batch_key,
    batch_count: row.batch_count,
    data: row.data,
  }
}

// GET /api/notifications - List notifications with cursor-based pagination
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/notifications')
  try {
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Fetching notifications', {
      userId: user.id,
      filter,
      limit,
      hasCursor: !!cursor,
    })

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to determine if there's a next page

    if (filter === 'unread') {
      query = query.eq('is_read', false)
    } else if (filter === 'read') {
      query = query.eq('is_read', true)
    }

    const { data, error } = await query

    if (error) throw error

    const cursorPayload = cursor ? decodeCursor(cursor) : null

    // Type assertion: Supabase returns data as Notification[]
    const notifications = (data ?? []) as Notification[]

    const filteredByCursor = cursorPayload
      ? notifications.filter((row) => satisfiesCursor(row, cursorPayload))
      : notifications

    const filtered = filteredByCursor.filter((row) => matchesFilter(row, filter))

    const hasMore = filtered.length > limit
    const limitedRows = filtered.slice(0, limit)

    const sanitizedNotifications = limitedRows
      .map(sanitizeNotification)
      .filter(
        (notif): notif is NonNullable<ReturnType<typeof sanitizeNotification>> => notif !== null
      )

    const lastRow = limitedRows[limitedRows.length - 1]
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({
            createdAt: lastRow.created_at,
            id: lastRow.id,
          })
        : null

    return NextResponse.json({
      notifications: sanitizedNotifications,
      pageInfo: {
        hasMore,
        nextCursor,
        limit,
        filter,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/notifications' })
  }
})
// PATCH /api/notifications - Mark all notifications as read
export const PATCH = withRateLimit(async function PATCH(_request: Request) {
  const logger = createAPILogger('PATCH', '/api/notifications')
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Capture cutoff time BEFORE starting the update
    // This prevents notifications that arrive during the operation from being marked as read
    const cutoffTime = new Date().toISOString()

    // Use atomic function with timestamp cutoff and row locking
    // This prevents race conditions with incoming notifications
    const { data: result, error: rpcError } = await supabase
      .rpc('mark_notifications_read_before', {
        p_user_id: user.id,
        p_cutoff_time: cutoffTime,
      })
      .single<{ updated_count: number; updated_ids: string[] }>()

    if (rpcError) {
      logger.error('Error marking all notifications as read', rpcError)
      return NextResponse.json(
        {
          error: 'Failed to mark all notifications as read',
          details: rpcError.message,
        },
        { status: 500 }
      )
    }

    // result contains: { updated_ids: UUID[], updated_count: number }
    const updatedCount = result?.updated_count ?? 0
    const updatedIds = result?.updated_ids ?? []

    logger.info('Marked notifications as read', {
      count: updatedCount,
      cutoffTime,
      sampleIds: updatedIds.slice(0, 5), // Log first 5 IDs
    })

    return NextResponse.json({
      success: true,
      updatedCount,
      cutoffTime, // Return cutoff time for frontend reconciliation
    })
  } catch (error) {
    return handleAPIError(error, { method: 'PATCH', path: '/api/notifications' })
  }
})
