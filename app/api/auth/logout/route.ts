import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/auth/logout - Sign out the current user
 *
 * @param _request - Next.js request
 * @returns Success response confirming logout
 */
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/auth/logout')

  try {
    const supabase = await createClient()

    logger.info('Logging out user')

    const { error } = await supabase.auth.signOut()

    if (error) throw error

    logger.info('User logged out successfully')

    return createSuccessResponse(null, {
      message: 'Logged out successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/auth/logout',
    })
  }
})
