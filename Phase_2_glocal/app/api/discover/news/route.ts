import { NextRequest } from 'next/server'
import { fetchLocalNews } from '@/lib/integrations/google-news'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/discover/news')
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'India'
    const limit = parseInt(searchParams.get('limit') || '10')

    const articles = await fetchLocalNews(city, limit)

    return createSuccessResponse(
      articles.map((article) => ({
        ...article,
        type: 'news',
      }))
    )
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/discover/news' })
  }
})
