import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/transparency/stats - Get public platform statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get total counts (publicly available data)
    const [
      { count: totalUsers },
      { count: totalCommunities },
      { count: totalPosts },
      { count: totalArtists },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('communities').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase
        .from('artists')
        .select('*', { count: 'exact', head: true })
        .in('subscription_status', ['trial', 'active']),
    ])

    // Get active users (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: activeUsers7d } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', sevenDaysAgo)

    const uniqueActive7d = new Set(activeUsers7d?.map((p) => p.author_id) || []).size

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: activeUsers30d } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', thirtyDaysAgo)

    const uniqueActive30d = new Set(activeUsers30d?.map((p) => p.author_id) || []).size

    // Get content from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: posts24h }, { count: comments24h }] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
    ])

    const stats = {
      total_users: totalUsers || 0,
      total_communities: totalCommunities || 0,
      total_posts: totalPosts || 0,
      total_artists: totalArtists || 0,
      active_users_7d: uniqueActive7d,
      active_users_30d: uniqueActive30d,
      posts_24h: posts24h || 0,
      comments_24h: comments24h || 0,
    }

    return NextResponse.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Fetch transparency stats error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    )
  }
}

