import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * PATCH /api/comments/[id] - Edit a comment (within 10 minutes)
 *
 * @param request - Next.js request with updated comment text
 * @param params - Route parameters with comment ID
 * @returns Updated comment
 */
export const PATCH = withRateLimit(async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: commentId } = params
  const logger = createAPILogger('PATCH', `/api/comments/${commentId}`)

  try {
    const body = await request.json()
    const { text } = body

    if (!text || text.trim().length === 0) {
      throw APIErrors.badRequest('Comment text is required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Updating comment', { commentId, userId: user.id })

    // Get the comment
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      throw APIErrors.notFound('Comment')
    }

    // Check if user is the author
    if (comment.author_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Check if comment was created within 10 minutes
    const createdAt = new Date(comment.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    if (diffMinutes > 10) {
      throw APIErrors.forbidden()
    }

    // Check if comment is deleted
    if (comment.is_deleted) {
      throw APIErrors.badRequest('Cannot edit deleted comment')
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({
        text: text.trim(),
        is_edited: true,
      })
      .eq('id', commentId)
      .select()
      .single()

    if (updateError) throw updateError

    logger.info('Comment updated successfully', { commentId, userId: user.id })

    return createSuccessResponse(updatedComment, {
      message: 'Comment updated successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PATCH',
      path: `/api/comments/${commentId}`,
    })
  }
})

/**
 * DELETE /api/comments/[id] - Soft delete a comment
 *
 * @param _request - Next.js request
 * @param params - Route parameters with comment ID
 * @returns Success response
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: commentId } = params
  const logger = createAPILogger('DELETE', `/api/comments/${commentId}`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Deleting comment', { commentId, userId: user.id })

    // Get the comment
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id, is_deleted')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      throw APIErrors.notFound('Comment')
    }

    // Check if user is the author
    if (comment.author_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Check if already deleted
    if (comment.is_deleted) {
      throw APIErrors.badRequest('Comment already deleted')
    }

    // Soft delete: replace text with "[deleted]" and mark as deleted
    const { error: deleteError } = await supabase
      .from('comments')
      .update({
        text: '[deleted]',
        is_deleted: true,
      })
      .eq('id', commentId)

    if (deleteError) throw deleteError

    logger.info('Comment deleted successfully', { commentId, userId: user.id })

    return createSuccessResponse(null, {
      message: 'Comment deleted successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/comments/${commentId}`,
    })
  }
})
