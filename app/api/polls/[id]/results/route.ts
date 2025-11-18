import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    // Sort options by position
    const sortedOptions = poll.options.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    )

    return createSuccessResponse({
      ...poll,
      options: sortedOptions,
    })
  } catch (error) {
    const { id: errorPollId } = await params
    return handleAPIError(error, { method: 'GET', path: `/api/polls/${errorPollId}/results` })
  }
})
