import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/comments/[id]/vote - Vote on a comment
 *
 * @param request - Next.js request with vote_type
 * @param params - Route parameters with comment ID
 * @returns Updated vote counts and user vote status
 */
export const POST = withRateLimit(async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: commentId } = params
  const logger = createAPILogger('POST', `/api/comments/${commentId}/vote`)

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

    logger.info('Processing comment vote', {
      commentId,
      userId: user.id,
      voteType: vote_type,
    })

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('content_type', 'comment')
      .eq('content_id', commentId)
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
        content_type: 'comment',
        content_id: commentId,
        user_id: user.id,
        vote_type,
      })
    }

    // Recalculate vote counts
    const { count: upvoteCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'comment')
      .eq('content_id', commentId)
      .eq('vote_type', 'upvote')

    const { count: downvoteCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'comment')
      .eq('content_id', commentId)
      .eq('vote_type', 'downvote')

    // Update comment with new counts
    await supabase
      .from('comments')
      .update({
        upvotes: upvoteCount || 0,
        downvotes: downvoteCount || 0,
      })
      .eq('id', commentId)

    // Get user's current vote
    const { data: currentVote } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('content_type', 'comment')
      .eq('content_id', commentId)
      .eq('user_id', user.id)
      .single()

    logger.info('Comment vote processed successfully', {
      commentId,
      userId: user.id,
      upvotes: upvoteCount || 0,
      downvotes: downvoteCount || 0,
    })

    return createSuccessResponse({
      upvotes: upvoteCount || 0,
      downvotes: downvoteCount || 0,
      userVote: currentVote?.vote_type || null,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/comments/${commentId}/vote`,
    })
  }
})
