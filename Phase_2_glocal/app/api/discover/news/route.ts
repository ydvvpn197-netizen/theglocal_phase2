import { NextRequest, NextResponse } from 'next/server'
import { fetchLocalNews } from '@/lib/integrations/google-news'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'India'
    const limit = parseInt(searchParams.get('limit') || '10')

    const articles = await fetchLocalNews(city, limit)

    return NextResponse.json({
      success: true,
      data: articles.map((article) => ({
        ...article,
        type: 'news',
      })),
    })
  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch news',
      },
      { status: 500 }
    )
  }
}
