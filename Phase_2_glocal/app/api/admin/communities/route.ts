import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/admin/communities - List all communities
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/admin/communities')

  try {
    // Require admin authentication
    const { user, supabase } = await requireAdminOrThrow()

    logger.info('Fetching all communities', { userId: user.id })

    // Fetch all communities
    const { data: communities, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    logger.info('Communities fetched successfully', { count: communities?.length || 0 })

    return createSuccessResponse(communities)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/admin/communities',
    })
  }
})
