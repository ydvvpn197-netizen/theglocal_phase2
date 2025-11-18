import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/stats/public - Get public platform statistics
export const GET = withRateLimit(async function GET() {
  const logger = createAPILogger('GET', '/api/stats/public')
  try {
    const supabase = await createClient()

    // Get current counts
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalComments },
      { count: totalCommunities },
      { count: totalEvents },
      { count: totalArtists },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('communities').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('artists').select('*', { count: 'exact', head: true }),
    ])

    // Get users and posts created in last 24h for percentage change
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: users24h }, { count: posts24h }] = await Promise.all([
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo),
    ])

    // Calculate percentage changes
    const previousDayUsers = (totalUsers || 0) - (users24h || 0)
    const usersChange24h = previousDayUsers > 0 ? ((users24h || 0) / previousDayUsers) * 100 : 0

    const previousDayPosts = (totalPosts || 0) - (posts24h || 0)
    const postsChange24h = previousDayPosts > 0 ? ((posts24h || 0) / previousDayPosts) * 100 : 0

    const stats = {
      total_users: totalUsers || 0,
      users_change_24h: Math.round(usersChange24h * 100) / 100, // Round to 2 decimal places
      total_posts: totalPosts || 0,
      posts_change_24h: Math.round(postsChange24h * 100) / 100, // Round to 2 decimal places
      total_comments: totalComments || 0,
      total_communities: totalCommunities || 0,
      total_events: totalEvents || 0,
      total_artists: totalArtists || 0,
    }

    return createSuccessResponse(stats, { generated_at: new Date().toISOString() })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/stats/public' })
  }
})
