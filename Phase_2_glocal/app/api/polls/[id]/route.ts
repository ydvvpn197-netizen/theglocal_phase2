import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateVotingHash } from '@/lib/utils/poll-anonymity'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: pollId } = params

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
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
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

    return NextResponse.json({
      success: true,
      data: {
        ...poll,
        options: sortedOptions,
        user_voted: userVoted,
        user_selected_option: userSelectedOption,
      },
    })
  } catch (error) {
    console.error('Fetch poll error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch poll',
      },
      { status: 500 }
    )
  }
}
