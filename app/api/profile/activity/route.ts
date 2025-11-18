import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/profile/activity - Fetch user activity feed
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/profile/activity')
  try {
    const searchParams = _request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const type = searchParams.get('type') || 'all' // posts, comments, all
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const activities: unknown[] = []

    // Fetch posts if requested
    if (type === 'posts' || type === 'all') {
      const { data: posts } = await supabase
        .from('posts')
        .select(
          `
          id,
          title,
          body,
          image_url,
          upvotes,
          downvotes,
          comment_count,
          created_at,
          is_deleted,
          community:communities(name, slug)
        `
        )
        .eq('author_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(type === 'posts' ? limit : Math.floor(limit / 2))

      if (posts) {
        activities.push(
          ...posts.map((post) => ({
            type: 'post',
            id: post.id,
            content: post,
            created_at: post.created_at,
          }))
        )
      }
    }

    // Fetch comments if requested
    if (type === 'comments' || type === 'all') {
      const { data: comments } = await supabase
        .from('comments')
        .select(
          `
          id,
          body,
          upvotes,
          downvotes,
          created_at,
          is_deleted,
          post:posts(id, title, community:communities(name, slug))
        `
        )
        .eq('author_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(type === 'comments' ? limit : Math.floor(limit / 2))

      if (comments) {
        activities.push(
          ...comments.map((comment) => ({
            type: 'comment',
            id: comment.id,
            content: comment,
            created_at: comment.created_at,
          }))
        )
      }
    }

    // Sort by created_at and apply pagination
    activities.sort((a: unknown, b: unknown) => {
      const aObj = a as Record<string, unknown>
      const bObj = b as Record<string, unknown>
      return (
        new Date(bObj.created_at as string).getTime() -
        new Date(aObj.created_at as string).getTime()
      )
    })
    const paginatedActivities = activities.slice(offset, offset + limit)

    return createSuccessResponse(paginatedActivities, {
      total: activities.length,
      hasMore: offset + limit < activities.length,
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/profile/activity' })
  }
})
