import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCommunityAdmin } from '@/lib/utils/permissions'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/posts/[id]/pin - Pin or unpin a post (admin only)
 *
 * @param _request - Next.js request with pinned boolean
 * @param params - Route parameters with post ID
 * @returns Updated post data
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const logger = createAPILogger('POST', `/api/posts/${postId}/pin`)

  try {
    const body = await _request.json()
    const { pinned } = body

    if (typeof pinned !== 'boolean') {
      throw APIErrors.badRequest('pinned field is required and must be a boolean')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Pinning/unpinning post', {
      postId,
      userId: user.id,
      pinned,
    })

    // Get the post to find its community
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('community_id, is_pinned')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      throw APIErrors.notFound('Post')
    }

    // Check if user is community admin
    try {
      await requireCommunityAdmin(user.id, post.community_id)
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        throw APIErrors.forbidden()
      }
      throw error
    }

    // If pinning, unpin any currently pinned posts in this community
    if (pinned) {
      await supabase
        .from('posts')
        .update({ is_pinned: false, pinned_at: null, pinned_by: null })
        .eq('community_id', post.community_id)
        .eq('is_pinned', true)
    }

    // Update the post
    interface PostUpdateData {
      is_pinned: boolean
      pinned_at: string | null
      pinned_by: string | null
    }

    const updateData: PostUpdateData = {
      is_pinned: pinned,
      pinned_at: pinned ? new Date().toISOString() : null,
      pinned_by: pinned ? user.id : null,
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (updateError) throw updateError

    logger.info('Post pin status updated successfully', {
      postId,
      userId: user.id,
      pinned,
    })

    return createSuccessResponse(updatedPost, {
      message: pinned ? 'Post pinned successfully' : 'Post unpinned successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/posts/${postId}/pin`,
    })
  }
})
