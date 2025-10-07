import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/posts/[id] - Edit a post (within 10 minutes)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: postId } = params
    const body = await request.json()
    const { title, body: postBody } = body

    if (!title && !postBody) {
      return NextResponse.json(
        { error: 'At least one field (title or body) is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user is the author
    if (post.author_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 })
    }

    // Check if post was created within 10 minutes
    const createdAt = new Date(post.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    if (diffMinutes > 10) {
      return NextResponse.json(
        { error: 'Posts can only be edited within 10 minutes of creation' },
        { status: 403 }
      )
    }

    // Check if post is deleted
    if (post.is_deleted) {
      return NextResponse.json({ error: 'Cannot edit deleted post' }, { status: 400 })
    }

    // Update post
    const updateData: { is_edited: boolean; title?: string; body?: string } = {
      is_edited: true,
    }

    if (title) updateData.title = title
    if (postBody) updateData.body = postBody

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost,
    })
  } catch (error) {
    console.error('Update post error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update post',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id] - Soft delete a post
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: postId } = params

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id, is_deleted')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user is the author
    if (post.author_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 })
    }

    // Check if already deleted
    if (post.is_deleted) {
      return NextResponse.json({ error: 'Post already deleted' }, { status: 400 })
    }

    // Soft delete: mark as deleted
    const { error: deleteError } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', postId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete post',
      },
      { status: 500 }
    )
  }
}
