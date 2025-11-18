import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// PUT /api/admin/users/[id]/unban - Unban a user
export const PUT = withRateLimit(async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Require admin authentication
    const { user, supabase } = await requireAdminOrThrow()

    // Update user to remove ban
    const { data: unbannedUser, error: unbanError } = await supabase
      .from('users')
      .update({
        is_banned: false,
        ban_expires_at: null,
        ban_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (unbanError) throw unbanError

    // Log the unban action
    await supabase.from('moderation_log').insert({
      action: 'unban_user',
      actor_id: user.id,
      target_type: 'user',
      target_id: id,
      details: { reason: 'Manual unban by super admin' },
    })

    return createSuccessResponse(unbannedUser, {
      message: 'User unbanned successfully',
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/admin/users/${errorId}/unban`,
    })
  }
})
