import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'

// GET /api/admin/stats - Get admin platform statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify super admin
    const isAdmin = await isSuperAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Get comprehensive stats
    const [
      { count: totalUsers },
      { count: totalCommunities },
      { count: totalPosts },
      { count: totalComments },
      { count: totalArtists },
      { count: activeArtists },
      { count: subscriptionsTrial },
      { count: subscriptionsActive },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('communities').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('artists').select('*', { count: 'exact', head: true }),
      supabase.from('artists').select('*', { count: 'exact', head: true }).in('subscription_status', ['trial', 'active']),
      supabase.from('artists').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
      supabase.from('artists').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    ])

    // Get active users
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: activeUsers7d } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', sevenDaysAgo)

    const { data: activeUsers30d } = await supabase
      .from('posts')
      .select('author_id')
      .gte('created_at', thirtyDaysAgo)

    const uniqueActive7d = new Set(activeUsers7d?.map((p) => p.author_id) || []).size
    const uniqueActive30d = new Set(activeUsers30d?.map((p) => p.author_id) || []).size

    // Get new users
    const { data: newUsers7d } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', sevenDaysAgo)

    // Get recent content
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: posts24h }, { count: comments24h }] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
    ])

    // Calculate revenue (₹500/month per active subscription)
    const monthlyRevenue = (subscriptionsActive || 0) * 500

    const stats = {
      total_users: totalUsers || 0,
      total_communities: totalCommunities || 0,
      total_posts: totalPosts || 0,
      total_comments: totalComments || 0,
      total_artists: totalArtists || 0,
      active_artists: activeArtists || 0,
      active_users_7d: uniqueActive7d,
      active_users_30d: uniqueActive30d,
      posts_24h: posts24h || 0,
      comments_24h: comments24h || 0,
      new_users_7d: newUsers7d?.length || 0,
      subscriptions_active: subscriptionsActive || 0,
      subscriptions_trial: subscriptionsTrial || 0,
      total_revenue_monthly: monthlyRevenue,
    }

    return NextResponse.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Fetch admin stats error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    )
  }
}
