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
    const searchParams = _request.nextUrl.searchParams
    const intervalType = searchParams.get('interval') || 'hourly' // 'hourly' or 'daily'
    const limit = parseInt(searchParams.get('limit') || '24') // Default to 24 hours/days

    if (!['hourly', 'daily'].includes(intervalType)) {
      return NextResponse.json(
        { error: 'Invalid interval type. Must be "hourly" or "daily"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify poll exists
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id')
      .eq('id', pollId)
      .single()

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Get poll options
    const { data: options, error: optionsError } = await supabase
      .from('poll_options')
      .select('id, option_text, display_order')
      .eq('poll_id', pollId)
      .order('display_order', { ascending: true })

    if (optionsError) throw optionsError

    // Get vote history for this poll
    const { data: voteHistory, error: historyError } = await supabase
      .from('poll_vote_history')
      .select('*')
      .eq('poll_id', pollId)
      .eq('interval_type', intervalType)
      .order('recorded_at', { ascending: true })
      .limit(limit * (options?.length || 1)) // Limit per option

    if (historyError) throw historyError

    // Get current vote counts
    const { data: currentOptions, error: currentError } = await supabase
      .from('poll_options')
      .select('id, vote_count')
      .eq('poll_id', pollId)

    if (currentError) throw currentError

    // Transform data for frontend
    interface VoteHistoryItem {
      option_id: string
      recorded_at: string
      vote_count: number
    }

    interface OptionItem {
      id: string
      option_text: string
      vote_count?: number
    }

    const analyticsData = {
      poll_id: pollId,
      interval_type: intervalType,
      options:
        options?.map((option) => {
          const optionHistory =
            (voteHistory as VoteHistoryItem[] | null | undefined)?.filter(
              (h) => h.option_id === option.id
            ) || []
          const currentCount =
            (currentOptions as OptionItem[] | null | undefined)?.find((o) => o.id === option.id)
              ?.vote_count || 0

          return {
            option_id: option.id,
            option_text: option.option_text,
            current_vote_count: currentCount,
            history: optionHistory.map((h) => ({
              recorded_at: h.recorded_at,
              vote_count: h.vote_count,
            })),
          }
        }) || [],
    }

    return createSuccessResponse(analyticsData)
  } catch (error) {
    const { id: errorPollId } = await params
    return handleAPIError(error, { method: 'GET', path: `/api/polls/${errorPollId}/analytics` })
  }
})
// POST /api/polls/[id]/analytics - Record a snapshot manually
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params
    const body = await _request.json()
    const intervalType = body.interval || 'hourly'

    if (!['hourly', 'daily'].includes(intervalType)) {
      throw APIErrors.badRequest('Invalid interval type. Must be "hourly" or "daily"')
    }

    const supabase = await createClient()

    // Verify poll exists
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id')
      .eq('id', pollId)
      .single()

    if (pollError || !poll) {
      throw APIErrors.notFound('Poll')
    }

    // Record snapshot using database function
    const { error: snapshotError } = await supabase.rpc('record_poll_vote_snapshot', {
      target_poll_id: pollId,
      interval_type_param: intervalType,
    })

    if (snapshotError) throw snapshotError

    return createSuccessResponse(null, {
      message: 'Vote snapshot recorded successfully',
    })
  } catch (error) {
    const { id: errorPollId } = await params
    return handleAPIError(error, { method: 'POST', path: `/api/polls/${errorPollId}/analytics` })
  }
})
