import { NextRequest } from 'next/server'
import { fetchLocalNews } from '@/lib/integrations/google-news'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/discover/news/[id]')
  try {
    const { id } = await params
    const newsId = id

    // Mock data for testing
    const mockArticles = [
      {
        id: 'news-test-1',
        title: 'Local Community Platform Launches New Features',
        description:
          'The platform has introduced new discovery features to help users find local events, news, and community discussions. This update brings enhanced user experience and better content discovery.',
        url: 'https://example.com/news/1',
        source: 'Local News',
        publishedAt: new Date().toISOString(),
        imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800',
        content:
          '<p>The Local Community Platform has announced a major update that introduces several new features designed to enhance user engagement and content discovery.</p><p>Key features include:</p><ul><li>Enhanced discovery feed with personalized content</li><li>Improved event booking system</li><li>Better community interaction tools</li><li>Real-time notifications</li></ul>',
      },
      {
        id: 'news-test-2',
        title: 'Digital Communities Thriving in the City',
        description:
          'Local digital communities are seeing increased engagement as more residents join online discussions.',
        url: 'https://example.com/news/2',
        source: 'Tech Today',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800',
        content:
          '<p>Digital communities across the city are experiencing unprecedented growth as residents increasingly turn to online platforms for local discussions and community building.</p>',
      },
    ]

    // Find the article by ID or by title hash
    let article = mockArticles.find((article) => article.id === newsId)

    // If not found in mock data, try to fetch from API
    if (!article) {
      try {
        const newsArticles = await fetchLocalNews('India', 50)
        const foundArticle = newsArticles.find((apiArticle) => {
          if (apiArticle.id === newsId) return true
          const titleHash = apiArticle.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 10)
          return titleHash === newsId
        })

        if (foundArticle) {
          article = {
            id: foundArticle.id,
            title: foundArticle.title,
            description: foundArticle.description || '',
            url: foundArticle.url,
            source: foundArticle.source,
            publishedAt: foundArticle.publishedAt,
            imageUrl: foundArticle.imageUrl || '',
            content: foundArticle.content || '',
          }
        }
      } catch (error) {
        // Log error but continue - might be API issue
        logger.warn('Error fetching from news API', { error })
      }
    }

    if (!article) {
      throw APIErrors.notFound('Article')
    }

    // Enhance article with additional content if available
    const enhancedArticle = {
      ...article,
      content: article.content || (await fetchArticleContent(article.url)),
    }

    return createSuccessResponse(enhancedArticle)
  } catch (error) {
    const { id: errorNewsId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/discover/news/${errorNewsId}`,
    })
  }
})

/**
 * Attempt to fetch article content from the source URL
 * This is a placeholder - in production you might use services like
 * Mercury Parser, Readability, or similar to extract article content
 */
async function fetchArticleContent(url?: string): Promise<string | undefined> {
  if (!url) return undefined

  try {
    // For now, return undefined as we don't have a content extraction service
    // In production, you could:
    // 1. Use Mercury Parser API
    // 2. Use Readability.js
    // 3. Use a service like Diffbot or similar
    // 4. Store content when initially fetching articles

    return undefined
  } catch (error) {
    // Silently fail - content fetching is optional
    return undefined
  }
}
