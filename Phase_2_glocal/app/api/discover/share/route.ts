import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { community_id, title, body: postBody, external_url, content_type } = body

    if (!community_id || !title || !external_url) {
      return NextResponse.json(
        { error: 'community_id, title, and external_url are required' },
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

    // Create post with external URL metadata
    const postData = {
      community_id,
      author_id: user.id,
      title,
      body: postBody || `Shared from ${content_type || 'external source'}\n\n${external_url}`,
      location_city: profile?.location_city,
      // Store external URL in body for now (could add dedicated column later)
    }

    const { data: post, error: createError } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({
      success: true,
      message: 'Content shared to community successfully',
      data: post,
    })
  } catch (error) {
    console.error('Share content error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to share content',
      },
      { status: 500 }
    )
  }
}
