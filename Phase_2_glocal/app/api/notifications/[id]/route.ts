import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

const notificationIdSchema = z.string().uuid()

// PATCH /api/notifications/[id] - Mark notification as read
export const PATCH = withRateLimit(async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('PATCH', '/api/notifications/[id]')
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: notificationId } = await params
    const parsedId = notificationIdSchema.safeParse(notificationId)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 })
    }

    // Use atomic function with row-level locking to prevent race conditions
    // This function uses SELECT FOR UPDATE NO KEY UPDATE internally
    const { data: result, error: rpcError } = await supabase
      .rpc('lock_and_mark_notification_read', {
        p_notification_id: parsedId.data,
        p_user_id: user.id,
      })
      .single<{ success: boolean; was_unread: boolean }>()

    if (rpcError) {
      logger.error(
        'Error marking notification as read:',
        rpcError instanceof Error ? rpcError : undefined
      )
      return NextResponse.json(
        {
          error: 'Failed to mark notification as read',
          details: rpcError.message,
        },
        { status: 500 }
      )
    }

    // result contains: { was_unread: boolean, success: boolean }
    if (!result || !result.success) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Return whether the notification was actually updated
    return NextResponse.json({
      success: true,
      was_unread: result.was_unread,
    })
  } catch (error) {
    const { id: errorNotificationId } = await params
    return handleAPIError(error, {
      method: 'PATCH',
      path: `/api/notifications/${errorNotificationId}`,
    })
  }
})

// DELETE /api/notifications/[id] - Delete notification
export const DELETE = withRateLimit(async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notificationId } = await params
  const logger = createAPILogger('DELETE', `/api/notifications/${notificationId}`)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const parsedId = notificationIdSchema.safeParse(notificationId)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 })
    }

    // Verify the notification belongs to the user before deleting
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', parsedId.data)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      logger.error(
        'Error fetching notification:',
        fetchError instanceof Error ? fetchError : undefined
      )
      return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 })
    }

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', parsedId.data)
      .eq('user_id', user.id)

    if (deleteError) {
      logger.error(
        'Error deleting notification:',
        deleteError instanceof Error ? deleteError : undefined
      )
      return NextResponse.json(
        {
          error: 'Failed to delete notification',
          details: deleteError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/notifications/${notificationId}`,
    })
  }
})
