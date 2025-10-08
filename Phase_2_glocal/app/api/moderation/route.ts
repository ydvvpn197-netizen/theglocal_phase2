import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MODERATION_ACTIONS } from '@/lib/utils/constants'

// POST /api/moderation - Take moderation action on content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content_type, content_id, action, reason, report_id } = body

    if (!content_type || !content_id || !action || !reason) {
      return NextResponse.json(
        { error: 'content_type, content_id, action, and reason are required' },
        { status: 400 }
      )
    }

    if (!['post', 'comment', 'poll', 'user'].includes(content_type)) {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }

    if (!MODERATION_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // TODO: Verify user is admin or moderator
    // For now, we'll implement basic checks

    // Get community_id based on content
    let communityId: string | null = null

    if (content_type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('community_id')
        .eq('id', content_id)
        .single()
      communityId = post?.community_id || null
    } else if (content_type === 'comment') {
      const { data: comment } = await supabase
        .from('comments')
        .select('posts!inner(community_id)')
        .eq('id', content_id)
        .single()
      communityId = comment?.posts?.community_id || null
    } else if (content_type === 'poll') {
      const { data: poll } = await supabase
        .from('polls')
        .select('community_id')
        .eq('id', content_id)
        .single()
      communityId = poll?.community_id || null
    }

    // Take action on content
    if (action === 'removed') {
      await removeContent(supabase, content_type, content_id)
    } else if (action === 'temp_banned' || action === 'banned') {
      // For user bans, implement in admin section
      // For now, just log it
    }

    // Log moderation action
    const { data: moderationLog, error: logError } = await supabase
      .from('moderation_log')
      .insert({
        moderator_id: user.id,
        content_type,
        content_id,
        community_id: communityId,
        action,
        reason,
        report_id,
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging moderation action:', logError)
      // Continue anyway
    }

    // Update report status if provided
    if (report_id) {
      await supabase
        .from('reports')
        .update({
          status: 'actioned',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', report_id)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Moderation action completed successfully',
        data: moderationLog,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Moderation action error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to execute moderation action',
      },
      { status: 500 }
    )
  }
}

// Helper function to remove content
async function removeContent(
  supabase: any,
  contentType: string,
  contentId: string
): Promise<void> {
  const removedText = '[removed by moderator]'

  if (contentType === 'post') {
    await supabase
      .from('posts')
      .update({
        is_deleted: true,
        title: removedText,
        body: removedText,
        image_url: null,
      })
      .eq('id', contentId)
  } else if (contentType === 'comment') {
    await supabase
      .from('comments')
      .update({
        is_deleted: true,
        body: removedText,
      })
      .eq('id', contentId)
  } else if (contentType === 'poll') {
    await supabase
      .from('polls')
      .update({
        is_deleted: true,
        question: removedText,
      })
      .eq('id', contentId)
  }
}

