import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/posts/[id]/vote - Vote on a post
 *
 * @param request - Next.js request with vote_type
 * @param params - Route parameters with post ID
 * @returns Updated vote counts and user vote status
 */
export const POST = withRateLimit(async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params
  const logger = createAPILogger('POST', `/api/posts/${postId}/vote`)

  try {
    const { vote_type } = await request.json()

    if (!vote_type || !['upvote', 'downvote'].includes(vote_type)) {
      throw APIErrors.badRequest('Invalid vote_type')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Processing vote', {
      postId,
      userId: user.id,
      voteType: vote_type,
    })

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('content_type', 'post')
      .eq('content_id', postId)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Remove vote (user clicked same button)
        await supabase.from('votes').delete().eq('id', existingVote.id)
      } else {
        // Change vote
        await supabase.from('votes').update({ vote_type }).eq('id', existingVote.id)
      }
    } else {
      // New vote
      await supabase.from('votes').insert({
        content_type: 'post',
        content_id: postId,
        user_id: user.id,
        vote_type,
      })
    }

    // Recalculate vote counts
    const { count: upvoteCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'post')
      .eq('content_id', postId)
      .eq('vote_type', 'upvote')

    const { count: downvoteCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'post')
      .eq('content_id', postId)
      .eq('vote_type', 'downvote')

    // Update post with new counts
    await supabase
      .from('posts')
      .update({
        upvotes: upvoteCount || 0,
        downvotes: downvoteCount || 0,
      })
      .eq('id', postId)

    // Fetch updated post
    const { data: updatedPost } = await supabase
      .from('posts')
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single()

    // Get user's current vote
    const { data: currentVote } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('content_type', 'post')
      .eq('content_id', postId)
      .eq('user_id', user.id)
      .single()

    logger.info('Vote processed successfully', {
      postId,
      userId: user.id,
      upvotes: updatedPost?.upvotes || 0,
      downvotes: updatedPost?.downvotes || 0,
    })

    return createSuccessResponse({
      upvotes: updatedPost?.upvotes || 0,
      downvotes: updatedPost?.downvotes || 0,
      userVote: currentVote?.vote_type || null,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/posts/${postId}/vote`,
    })
  }
})
