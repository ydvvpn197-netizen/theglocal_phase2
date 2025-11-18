import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { z } from 'zod'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

const banUserSchema = z.object({
  duration: z.enum(['temporary', 'permanent']),
  reason: z.string().min(10, 'Ban reason must be at least 10 characters'),
})

// PUT /api/admin/users/[id]/ban - Ban a user
export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Require admin authentication
    const { user, supabase } = await requireAdminOrThrow()

    const body = await request.json()
    const { duration, reason } = banUserSchema.parse(body)

    // Calculate ban expiry date
    let banExpiresAt: string | null = null
    if (duration === 'temporary') {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7) // 7 days from now
      banExpiresAt = expiryDate.toISOString()
    }

    // Update user ban status
    const { data: bannedUser, error: banError } = await supabase
      .from('users')
      .update({
        is_banned: true,
        ban_expires_at: banExpiresAt,
        ban_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (banError) throw banError

    // Log the ban action
    await supabase.from('moderation_log').insert({
      action: 'ban_user',
      actor_id: user.id,
      target_type: 'user',
      target_id: id,
      details: { duration, reason, ban_expires_at: banExpiresAt },
    })

    return createSuccessResponse(bannedUser, {
      message: `User ${duration === 'permanent' ? 'permanently' : 'temporarily'} banned`,
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/admin/users/${errorId}/ban`,
    })
  }
})
