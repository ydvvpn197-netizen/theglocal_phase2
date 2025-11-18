import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateVotingHash, isPollActive } from '@/lib/utils/poll-anonymity'
import { handleAPIError } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const POST = withRateLimit(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params
    const body = await request.json()
    const { option_id } = body

    if (!option_id) {
      return NextResponse.json({ error: 'option_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get poll details
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*, options:poll_options(*)')
      .eq('id', pollId)
      .single()

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Check if poll is still active
    if (!isPollActive(poll.expires_at)) {
      return NextResponse.json({ error: 'Poll has expired' }, { status: 400 })
    }

    // Verify option belongs to this poll
    const option = poll.options.find((opt: { id: string }) => opt.id === option_id)
    if (!option) {
      return NextResponse.json({ error: 'Invalid option for this poll' }, { status: 400 })
    }

    // Generate anonymous voting hash
    const votingSecret = process.env.POLL_VOTING_SECRET || 'default-secret-change-me'
    const votingHash = generateVotingHash(user.id, pollId, votingSecret)

    // Check if user already voted (using anonymous hash)
    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('voting_hash', votingHash)
      .single()

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted on this poll' }, { status: 400 })
    }

    // Record vote (anonymous hash only, no user_id stored)
    const { error: voteError } = await supabase.from('poll_votes').insert({
      poll_id: pollId,
      option_id,
      voting_hash: votingHash,
      // Note: user_id is NOT stored for anonymity
    })

    if (voteError) throw voteError

    // Increment vote count on the option
    await supabase.rpc('increment_poll_option_votes', {
      option_id,
    })

    // Increment total votes on the poll
    await supabase
      .from('polls')
      .update({ total_votes: (poll.total_votes || 0) + 1 })
      .eq('id', pollId)

    // Fetch updated results
    const { data: updatedOptions } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId)
      .order('position')

    return NextResponse.json({
      success: true,
      message: 'Vote recorded anonymously',
      data: {
        options: updatedOptions || [],
        total_votes: (poll.total_votes || 0) + 1,
      },
    })
  } catch (error) {
    const { id: errorPollId } = await params
    return handleAPIError(error, { method: 'POST', path: `/api/polls/${errorPollId}/vote` })
  }
})
