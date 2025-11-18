import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateVotingHash } from '@/lib/utils/poll-anonymity'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params

    const supabase = await createClient()

    // Get current user (optional - for checking if they voted)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get poll with options
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        community:communities!community_id(name, slug),
        options:poll_options(id, text, vote_count, position)
      `
      )
      .eq('id', pollId)
      .single()

    if (pollError || !poll) {
      throw APIErrors.notFound('Poll')
    }

    // Check if user has voted (if authenticated)
    let userVoted = false
    let userSelectedOption = null

    if (user) {
      const votingSecret = process.env.POLL_VOTING_SECRET || 'default-secret-change-me'
      const votingHash = generateVotingHash(user.id, pollId, votingSecret)

      const { data: vote } = await supabase
        .from('poll_votes')
        .select('option_id')
        .eq('poll_id', pollId)
        .eq('voting_hash', votingHash)
        .single()

      if (vote) {
        userVoted = true
        userSelectedOption = vote.option_id
      }
    }

    // Sort options by position
    const sortedOptions = poll.options.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    )

    return createSuccessResponse({
      ...poll,
      options: sortedOptions,
      user_voted: userVoted,
      user_selected_option: userSelectedOption,
    })
  } catch (error) {
    const { id: errorPollId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/polls/${errorPollId}`,
    })
  }
})
