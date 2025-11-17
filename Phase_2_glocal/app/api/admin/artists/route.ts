import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/admin/artists - List all artists with subscription info
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/admin/artists')

  try {
    // Require admin authentication
    const { user, supabase } = await requireAdminOrThrow()

    // Get filter parameters
    const statusFilter = request.nextUrl.searchParams.get('status')

    logger.info('Fetching all artists', { userId: user.id, statusFilter })

    let query = supabase.from('artists').select('*').order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('subscription_status', statusFilter)
    }

    const { data: artists, error } = await query

    if (error) throw error

    logger.info('Artists fetched successfully', { count: artists?.length || 0 })

    return createSuccessResponse(artists)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/admin/artists',
    })
  }
})
