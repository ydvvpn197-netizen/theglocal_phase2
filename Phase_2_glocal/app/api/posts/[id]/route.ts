import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * PATCH /api/posts/[id] - Edit a post (within 10 minutes of creation)
 *
 * @param request - Next.js request with updated post data
 * @param params - Route parameters with post ID
 * @returns Updated post data
 */
export const PATCH = withRateLimit(async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params
  const logger = createAPILogger('PATCH', `/api/posts/${postId}`)

  try {
    const body = await request.json()
    const { title, body: postBody } = body

    if (!title && !postBody) {
      throw APIErrors.badRequest('At least one field (title or body) is required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Updating post', {
      postId,
      userId: user.id,
      hasTitle: !!title,
      hasBody: !!postBody,
    })

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      throw APIErrors.notFound('Post')
    }

    // Check if user is the author
    if (post.author_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Check if post was created within 10 minutes
    const createdAt = new Date(post.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    if (diffMinutes > 10) {
      throw APIErrors.forbidden()
    }

    // Check if post is deleted
    if (post.is_deleted) {
      throw APIErrors.badRequest('Cannot edit deleted post')
    }

    // Update post
    const updateData: { is_edited: boolean; title?: string; body?: string } = {
      is_edited: true,
    }

    if (title) updateData.title = title
    if (postBody) updateData.body = postBody

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (updateError) throw updateError

    logger.info('Post updated successfully', { postId, userId: user.id })

    return createSuccessResponse(updatedPost, { message: 'Post updated successfully' })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PATCH',
      path: `/api/posts/${postId}`,
    })
  }
})

/**
 * DELETE /api/posts/[id] - Soft delete a post
 *
 * @param _request - Next.js request (unused)
 * @param params - Route parameters with post ID
 * @returns Success message
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params
  const logger = createAPILogger('DELETE', `/api/posts/${postId}`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Deleting post', { postId, userId: user.id })

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id, is_deleted')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      throw APIErrors.notFound('Post')
    }

    // Check if user is the author
    if (post.author_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Check if already deleted
    if (post.is_deleted) {
      throw APIErrors.badRequest('Post already deleted')
    }

    // Soft delete: mark as deleted
    const { error: deleteError } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', postId)

    if (deleteError) throw deleteError

    logger.info('Post deleted successfully', { postId, userId: user.id })

    return createSuccessResponse(null, { message: 'Post deleted successfully' })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/posts/${postId}`,
    })
  }
})
