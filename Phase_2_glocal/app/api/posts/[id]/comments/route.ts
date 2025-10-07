import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/posts/[id]/comments - List comments for a post
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: postId } = params
    const supabase = await createClient()

    // Fetch top-level comments (parent_id is null)
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        replies:comments!parent_id(
          *,
          author:users!author_id(anonymous_handle, avatar_seed)
        )
      `
      )
      .eq('post_id', postId)
      .is('parent_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: comments || [],
    })
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch comments',
      },
      { status: 500 }
    )
  }
}

// POST /api/posts/[id]/comments - Create a new comment
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: postId } = params
    const body = await request.json()
    const { text, parent_id } = body

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

    // Verify post exists and is not deleted
    const { data: post } = await supabase
      .from('posts')
      .select('id, community_id, is_deleted')
      .eq('id', postId)
      .single()

    if (!post || post.is_deleted) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user is a member of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', post.community_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of this community to comment' },
        { status: 403 }
      )
    }

    // If parent_id provided, verify it exists and enforce max 2-level nesting
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('parent_id')
        .eq('id', parent_id)
        .single()

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }

      // Disallow nested replies (max 2 levels: comment -> reply, no reply -> reply -> reply)
      if (parentComment.parent_id) {
        return NextResponse.json(
          { error: 'Cannot reply to a reply. Maximum 2 levels of nesting allowed.' },
          { status: 400 }
        )
      }
    }

    // Create comment
    const { data: comment, error: createError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        text,
        parent_id: parent_id || null,
      })
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed)
      `
      )
      .single()

    if (createError) throw createError

    return NextResponse.json({
      success: true,
      message: 'Comment created successfully',
      data: comment,
    })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create comment',
      },
      { status: 500 }
    )
  }
}
