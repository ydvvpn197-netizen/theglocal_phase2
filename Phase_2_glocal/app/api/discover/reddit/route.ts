import { NextRequest, NextResponse } from 'next/server'
import { fetchLocalRedditPosts } from '@/lib/integrations/reddit'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    const posts = await fetchLocalRedditPosts(city, limit)

    return NextResponse.json({
      success: true,
      data: posts.map((post) => ({
        ...post,
        type: 'reddit',
      })),
    })
  } catch (error) {
    console.error('Reddit API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch Reddit posts',
      },
      { status: 500 }
    )
  }
}
