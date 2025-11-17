import { NextRequest, NextResponse } from 'next/server'
import { fetchLocalRedditPosts } from '@/lib/integrations/reddit'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/discover/reddit')
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    const posts = await fetchLocalRedditPosts(city, limit)

    return createSuccessResponse(
      posts.map((post) => ({
        ...post,
        type: 'reddit',
      }))
    )
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/discover/reddit' })
  }
})
