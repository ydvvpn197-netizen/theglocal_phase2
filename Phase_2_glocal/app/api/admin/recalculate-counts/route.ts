import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/admin/recalculate-counts - Manually recalculate comment counts
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/admin/recalculate-counts')
  try {
    const body = (await _request.json()) as { type?: string; post_id?: string }
    const { type, post_id } = body

    // Require admin authentication
    const { supabase } = await requireAdminOrThrow()

    if (type === 'all') {
      // Recalculate all comment counts
      const { data: result, error } = await supabase.rpc('recalculate_all_comment_counts')

      if (error) {
        logger.error(
          'Error recalculating all comment counts:',
          error instanceof Error ? error : undefined
        )
        throw error
      }

      const recalcResult = (
        result as Array<{
          posts_updated?: number
          total_comments?: number
          execution_time_ms?: number
        }>
      )?.[0]

      return createSuccessResponse(
        {
          postsUpdated: recalcResult?.posts_updated || 0,
          totalComments: recalcResult?.total_comments || 0,
          executionTimeMs: recalcResult?.execution_time_ms || 0,
        },
        {
          message: 'Successfully recalculated all comment counts',
        }
      )
    } else if (type === 'post' && post_id) {
      // Recalculate comment count for specific post
      const { data: result, error } = await supabase.rpc('recalculate_post_comment_count', {
        post_id,
      })

      if (error) {
        logger.error(
          'Error recalculating post comment count:',
          error instanceof Error ? error : undefined
        )
        throw error
      }

      const recalcResult = (
        result as Array<{
          updated?: boolean
          old_count?: number
          new_count?: number
        }>
      )?.[0]

      if (!recalcResult) {
        throw APIErrors.notFound('Post not found')
      }

      return createSuccessResponse(
        {
          postId: post_id,
          oldCount: recalcResult.old_count,
          newCount: recalcResult.new_count,
          updated: recalcResult.updated,
        },
        {
          message: recalcResult.updated
            ? `Comment count updated from ${recalcResult.old_count} to ${recalcResult.new_count}`
            : 'Comment count was already correct',
        }
      )
    } else {
      throw APIErrors.badRequest('Invalid _request. Use type=')
    }
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/admin/recalculate-counts' })
  }
})
// GET /api/admin/recalculate-counts - Get comment count statistics
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    // Require admin authentication
    const { supabase } = await requireAdminOrThrow()

    // Get statistics about comment counts
    const { data: stats, error } = await supabase
      .from('posts')
      .select('comment_count')
      .neq('is_deleted', true)

    if (error) {
      throw error
    }

    const statsData = (stats as Array<{ comment_count?: number }>) || []
    const totalPosts = statsData.length
    const postsWithComments = statsData.filter((p) => (p.comment_count || 0) > 0).length
    const totalCommentCount = statsData.reduce((sum, p) => sum + (p.comment_count || 0), 0)
    const avgCommentsPerPost = totalPosts > 0 ? (totalCommentCount / totalPosts).toFixed(2) : '0'

    // Get actual comment count from comments table
    const { count: actualCommentCount, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)

    if (countError) {
      throw countError
    }

    const countDiscrepancy = totalCommentCount !== (actualCommentCount || 0)

    return createSuccessResponse({
      totalPosts,
      postsWithComments,
      totalCommentCountInPosts: totalCommentCount,
      actualCommentCount: actualCommentCount || 0,
      avgCommentsPerPost: parseFloat(avgCommentsPerPost),
      hasDiscrepancy: countDiscrepancy,
      discrepancy: (actualCommentCount || 0) - totalCommentCount,
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/admin/recalculate-counts' })
  }
})
