import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCommunityAdmin } from '@/lib/utils/permissions'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/posts/[id]/announcement - Mark/unmark post as announcement (admin only)
 *
 * @param _request - Next.js request with announcement boolean
 * @param params - Route parameters with post ID
 * @returns Updated post data
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const logger = createAPILogger('POST', `/api/posts/${postId}/announcement`)

  try {
    const body = await _request.json()
    const { announcement } = body

    if (typeof announcement !== 'boolean') {
      throw APIErrors.badRequest('announcement field is required and must be a boolean')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Updating announcement status', {
      postId,
      userId: user.id,
      announcement,
    })

    // Get the post to find its community
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('community_id, is_announcement')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      throw APIErrors.notFound('Post')
    }

    // Check if user is community admin
    await requireCommunityAdmin(user.id, post.community_id)

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({ is_announcement: announcement })
      .eq('id', postId)
      .select()
      .single()

    if (updateError) throw updateError

    logger.info('Announcement status updated successfully', {
      postId,
      userId: user.id,
      announcement,
    })

    return createSuccessResponse(updatedPost, {
      message: announcement ? 'Post marked as announcement' : 'Post unmarked as announcement',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/posts/${postId}/announcement`,
    })
  }
})
