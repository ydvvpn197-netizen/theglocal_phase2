import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/feed - Location-based feed aggregating posts from joined communities
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sort = searchParams.get('sort') || 'recent' // 'recent' or 'popular'
    const city = searchParams.get('city')
    const radius = parseFloat(searchParams.get('radius') || '25') // km

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let query = supabase
      .from('posts')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        community:communities!community_id(name, slug)
      `
      )
      .eq('is_deleted', false)

    // If user is authenticated, prioritize their joined communities
    if (user) {
      const { data: joinedCommunities } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)

      if (joinedCommunities && joinedCommunities.length > 0) {
        const communityIds = joinedCommunities.map((m) => m.community_id)
        query = query.in('community_id', communityIds)
      }
    }

    // Location filtering
    if (city) {
      query = query.eq('location_city', city)
    }

    // Sorting
    if (sort === 'popular') {
      // Sort by upvote ratio (upvotes - downvotes)
      query = query.order('upvotes', { ascending: false })
    } else {
      // Default: Recent
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: {
        limit,
        offset,
        sort,
        city,
        radius,
      },
    })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch feed',
      },
      { status: 500 }
    )
  }
}
