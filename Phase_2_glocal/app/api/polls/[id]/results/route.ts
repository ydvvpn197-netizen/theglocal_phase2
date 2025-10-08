import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: pollId } = params

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
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
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
      },
    })
  } catch (error) {
    console.error('Fetch poll results error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch poll results',
      },
      { status: 500 }
    )
  }
}
