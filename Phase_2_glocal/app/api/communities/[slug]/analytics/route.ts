import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCommunityAdmin } from '@/lib/utils/permissions'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/communities/[slug]/analytics - Get community analytics
 *
 * @param _request - Next.js request
 * @param params - Route parameters with slug
 * @returns Community analytics data
 */
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const logger = createAPILogger('GET', `/api/communities/${slug}/analytics`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Fetching community analytics', { userId: user.id, slug })

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single()

    if (communityError || !community) {
      throw APIErrors.notFound('Community')
    }

    // Check if user is admin (checks both creator and membership)
    const isAdmin = await isCommunityAdmin(user.id, community.id)

    if (!isAdmin) {
      throw APIErrors.forbidden()
    }

    // Get member growth over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: memberGrowth } = await supabase
      .from('community_members')
      .select('joined_at')
      .eq('community_id', community.id)
      .gte('joined_at', thirtyDaysAgo.toISOString())
      .order('joined_at', { ascending: true })

    // Get post activity over last 30 days
    const { data: postActivity } = await supabase
      .from('posts')
      .select('created_at')
      .eq('community_id', community.id)
      .eq('is_deleted', false)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Get top contributors (users with most posts)
    const { data: topContributors } = await supabase
      .from('posts')
      .select('author_id, users!author_id(anonymous_handle)')
      .eq('community_id', community.id)
      .eq('is_deleted', false)
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Count posts per user
    interface PostWithAuthor {
      author_id: string
      users?: {
        anonymous_handle: string | null
      } | null
    }
    const contributorMap = new Map<string, { handle: string; posts: number }>()
    ;(topContributors as PostWithAuthor[] | null)?.forEach((post) => {
      const userId = post.author_id
      const handle = post.users?.anonymous_handle || 'Unknown'
      const existing = contributorMap.get(userId)
      if (existing) {
        contributorMap.set(userId, {
          handle: existing.handle,
          posts: existing.posts + 1,
        })
      } else {
        contributorMap.set(userId, { handle, posts: 1 })
      }
    })

    const contributors = Array.from(contributorMap.values())
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 10)

    // Get most popular posts (by upvotes)
    const { data: popularPosts } = await supabase
      .from('posts')
      .select('id, title, upvotes, downvotes, comment_count, created_at')
      .eq('community_id', community.id)
      .eq('is_deleted', false)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('upvotes', { ascending: false })
      .limit(10)

    // Get engagement stats
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .eq('is_deleted', false)

    const { count: totalComments } = await supabase
      .from('comments')
      .select('c.*, p!inner(*)', { count: 'exact', head: true })
      .eq('p.community_id', community.id)
      .eq('c.is_deleted', false)

    const { count: totalMembers } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id)

    // Calculate engagement rate (posts + comments per member)
    const engagementRate =
      totalMembers && totalMembers > 0
        ? ((totalPosts || 0) + (totalComments || 0)) / totalMembers
        : 0

    logger.info('Community analytics fetched successfully', {
      communityId: community.id,
      userId: user.id,
    })

    return createSuccessResponse({
      overview: {
        totalMembers: totalMembers || 0,
        totalPosts: totalPosts || 0,
        totalComments: totalComments || 0,
        engagementRate: Math.round(engagementRate * 100) / 100,
      },
      memberGrowth: memberGrowth || [],
      postActivity: postActivity || [],
      topContributors: contributors,
      popularPosts: popularPosts || [],
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/communities/${slug}/analytics`,
    })
  }
})
