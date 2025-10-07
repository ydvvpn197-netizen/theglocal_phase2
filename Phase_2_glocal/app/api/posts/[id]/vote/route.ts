import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: postId } = params
    const { vote_type } = await request.json()

    if (!vote_type || !['upvote', 'downvote'].includes(vote_type)) {
      return NextResponse.json({ error: 'Invalid vote_type' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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

    return NextResponse.json({
      success: true,
      data: {
        upvotes: updatedPost?.upvotes || 0,
        downvotes: updatedPost?.downvotes || 0,
        userVote: currentVote?.vote_type || null,
      },
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process vote',
      },
      { status: 500 }
    )
  }
}
