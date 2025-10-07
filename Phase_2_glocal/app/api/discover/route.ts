import { NextRequest, NextResponse } from 'next/server'
import { fetchLocalNews } from '@/lib/integrations/google-news'
import { fetchLocalRedditPosts } from '@/lib/integrations/reddit'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'India'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Fetch content from multiple sources in parallel
    const [newsArticles, redditPosts] = await Promise.all([
      fetchLocalNews(city, Math.floor(limit / 2)),
      fetchLocalRedditPosts(city, Math.floor(limit / 2)),
    ])

    // Combine and format
    const newsItems = newsArticles.map((article) => ({
      ...article,
      type: 'news' as const,
    }))

    const redditItems = redditPosts.map((post) => ({
      ...post,
      type: 'reddit' as const,
    }))

    // Merge and interleave for diversity
    const allItems = [...newsItems, ...redditItems]

    // Smart sorting: mix content types, prioritize recent
    const sortedItems = allItems.sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime()
      const timeB = new Date(b.publishedAt).getTime()
      return timeB - timeA
    })

    // Deduplicate by title similarity
    const uniqueItems = deduplicateByTitle(sortedItems)

    return NextResponse.json({
      success: true,
      data: uniqueItems.slice(0, limit),
      meta: {
        sources: {
          news: newsItems.length,
          reddit: redditItems.length,
        },
        city,
      },
    })
  } catch (error) {
    console.error('Discovery API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch discovery content',
      },
      { status: 500 }
    )
  }
}

/**
 * Remove duplicate items with similar titles
 */
function deduplicateByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const normalizedTitle = item.title.toLowerCase().slice(0, 50)
    if (seen.has(normalizedTitle)) {
      return false
    }
    seen.add(normalizedTitle)
    return true
  })
}
