import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/posts/[id]/comments - List comments for a post
 *
 * @param _request - Next.js request
 * @param params - Route parameters with post ID
 * @returns List of comments with replies
 */
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params
  const logger = createAPILogger('GET', `/api/posts/${postId}/comments`)

  try {
    logger.info('Fetching comments', { postId })

    const supabase = await createClient()

    // Fetch top-level comments (parent_id is null)
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        replies:comments!parent_id(
          *,
          author:users!author_id(anonymous_handle, avatar_seed)
        )
      `
      )
      .eq('post_id', postId)
      .is('parent_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw error

    logger.info('Comments fetched successfully', {
      postId,
      count: comments?.length || 0,
    })

    return createSuccessResponse(comments || [])
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/posts/${postId}/comments`,
    })
  }
})

/**
 * POST /api/posts/[id]/comments - Create a new comment
 *
 * @param request - Next.js request with comment data
 * @param params - Route parameters with post ID
 * @returns Created comment
 */
export const POST = withRateLimit(async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params
  const logger = createAPILogger('POST', `/api/posts/${postId}/comments`)

  try {
    const body = await request.json()
    const { text, parent_id } = body

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

    logger.info('Creating comment', {
      postId,
      userId: user.id,
      hasParent: !!parent_id,
    })

    // Verify post exists and is not deleted
    const { data: post } = await supabase
      .from('posts')
      .select('id, community_id, is_deleted')
      .eq('id', postId)
      .single()

    if (!post || post.is_deleted) {
      throw APIErrors.notFound('Post')
    }

    // Verify user is a member of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', post.community_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      throw APIErrors.forbidden()
    }

    // If parent_id provided, verify it exists and enforce max 2-level nesting
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('parent_id')
        .eq('id', parent_id)
        .single()

      if (!parentComment) {
        throw APIErrors.notFound('Parent comment')
      }

      // Disallow nested replies (max 2 levels: comment -> reply, no reply -> reply -> reply)
      if (parentComment.parent_id) {
        throw APIErrors.badRequest('Cannot reply to a reply. Maximum 2 levels of nesting allowed.')
      }
    }

    // Create comment
    const { data: comment, error: createError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        text,
        parent_id: parent_id || null,
      })
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed)
      `
      )
      .single()

    if (createError) throw createError

    logger.info('Comment created successfully', {
      commentId: comment.id,
      postId,
      userId: user.id,
    })

    return createSuccessResponse(comment, {
      message: 'Comment created successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/posts/${postId}/comments`,
    })
  }
})
