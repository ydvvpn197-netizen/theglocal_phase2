import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/posts - List posts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const communityId = searchParams.get('community_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    let query = supabase
      .from('posts')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        community:communities!community_id(name, slug)
      `
      )
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (communityId) {
      query = query.eq('community_id', communityId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Fetch posts error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
      },
      { status: 500 }
    )
  }
}

// POST /api/posts - Create a new post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { community_id, title, body: postBody, image_url } = body

    if (!community_id || !title) {
      return NextResponse.json({ error: 'community_id and title are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify user is a member of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of this community to post' },
        { status: 403 }
      )
    }

    // Get user's location from profile
    const { data: profile } = await supabase
      .from('users')
      .select('location_city')
      .eq('id', user.id)
      .single()

    // Create post
    const { data: post, error: createError } = await supabase
      .from('posts')
      .insert({
        community_id,
        author_id: user.id,
        title,
        body: postBody,
        image_url,
        location_city: profile?.location_city,
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      data: post,
    })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create post',
      },
      { status: 500 }
    )
  }
}
