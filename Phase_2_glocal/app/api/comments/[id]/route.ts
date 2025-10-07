import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/comments/[id] - Edit a comment (within 10 minutes)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: commentId } = params
    const body = await request.json()
    const { text } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get the comment
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check if user is the author
    if (comment.author_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 })
    }

    // Check if comment was created within 10 minutes
    const createdAt = new Date(comment.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    if (diffMinutes > 10) {
      return NextResponse.json(
        { error: 'Comments can only be edited within 10 minutes of creation' },
        { status: 403 }
      )
    }

    // Check if comment is deleted
    if (comment.is_deleted) {
      return NextResponse.json({ error: 'Cannot edit deleted comment' }, { status: 400 })
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({
        text: text.trim(),
        is_edited: true,
      })
      .eq('id', commentId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
    })
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update comment',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/comments/[id] - Soft delete a comment
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: commentId } = params

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get the comment
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id, is_deleted')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check if user is the author
    if (comment.author_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
    }

    // Check if already deleted
    if (comment.is_deleted) {
      return NextResponse.json({ error: 'Comment already deleted' }, { status: 400 })
    }

    // Soft delete: replace text with "[deleted]" and mark as deleted
    const { error: deleteError } = await supabase
      .from('comments')
      .update({
        text: '[deleted]',
        is_deleted: true,
      })
      .eq('id', commentId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete comment',
      },
      { status: 500 }
    )
  }
}
