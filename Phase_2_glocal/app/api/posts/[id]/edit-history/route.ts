import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/posts/[id]/edit-history - Get edit history for a post
 *
 * @param _request - Next.js request
 * @param params - Route parameters with post ID
 * @returns Edit history data
 */
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const logger = createAPILogger('GET', `/api/posts/${postId}/edit-history`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Fetching edit history', { postId, userId: user.id })

    // First check if the post exists and user has access to it
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(
        `
        id,
        community_id,
        is_deleted,
        community:communities(edit_history_visible)
      `
      )
      .eq('id', postId)
      .single()

    if (postError || !post) {
      throw APIErrors.notFound('Post')
    }

    if (post.is_deleted) {
      throw APIErrors.notFound('Post')
    }

    // Check if user is a member of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', post.community_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      throw APIErrors.forbidden()
    }

    // Check if edit history is visible for this community
    interface CommunityData {
      edit_history_visible?: boolean
    }
    const community = post.community as CommunityData | null | undefined
    if (!community?.edit_history_visible) {
      return createSuccessResponse([], {
        message: 'Edit history is not visible in this community',
      })
    }

    // Get edit history using the database function
    const { data: editHistory, error: historyError } = await supabase.rpc('get_post_edit_history', {
      p_post_id: postId,
      p_limit: 50, // Get last 50 edits
    })

    if (historyError) {
      throw historyError
    }

    logger.info('Edit history fetched successfully', {
      postId,
      entryCount: editHistory?.length || 0,
    })

    return createSuccessResponse(editHistory || [], {
      postId,
      totalEntries: editHistory?.length || 0,
      historyVisible: community?.edit_history_visible,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/posts/${postId}/edit-history`,
    })
  }
})
