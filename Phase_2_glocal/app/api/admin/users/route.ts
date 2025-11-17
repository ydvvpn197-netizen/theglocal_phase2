import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/admin/users - List all users
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    // Require admin authentication
    const { supabase } = await requireAdminOrThrow()

    // Fetch all users with ban info
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, anonymous_handle, created_at, is_banned, ban_expires_at, ban_reason')
      .order('created_at', { ascending: false })

    if (error) throw error

    return createSuccessResponse(users)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/admin/users' })
  }
})
