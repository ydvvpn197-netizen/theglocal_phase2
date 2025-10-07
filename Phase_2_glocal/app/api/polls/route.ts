import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/polls - List polls with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const communityId = searchParams.get('community_id')
    const category = searchParams.get('category')
    const city = searchParams.get('city')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    let query = supabase
      .from('polls')
      .select(
        `
        *,
        author:users!author_id(anonymous_handle, avatar_seed),
        community:communities!community_id(name, slug),
        options:poll_options(id, text, vote_count)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (communityId) {
      query = query.eq('community_id', communityId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (city) {
      query = query.eq('location_city', city)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Fetch polls error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch polls',
      },
      { status: 500 }
    )
  }
}

// POST /api/polls - Create a new poll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { community_id, question, options, category, expires_at, tagged_authority } = body

    if (!community_id || !question || !options || !category) {
      return NextResponse.json(
        { error: 'community_id, question, options, and category are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
      return NextResponse.json(
        { error: 'Poll must have between 2 and 10 options' },
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
        { error: 'You must be a member of this community to create a poll' },
        { status: 403 }
      )
    }

    // Get user's location
    const { data: profile } = await supabase
      .from('users')
      .select('location_city')
      .eq('id', user.id)
      .single()

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        community_id,
        author_id: user.id,
        question,
        category,
        expires_at: expires_at || null,
        tagged_authority: tagged_authority || null,
        location_city: profile?.location_city,
      })
      .select()
      .single()

    if (pollError) throw pollError

    // Create poll options
    const pollOptionsData = options.map((text: string, index: number) => ({
      poll_id: poll.id,
      text,
      position: index,
    }))

    const { error: optionsError } = await supabase.from('poll_options').insert(pollOptionsData)

    if (optionsError) {
      // Rollback: delete the poll if options creation fails
      await supabase.from('polls').delete().eq('id', poll.id)
      throw optionsError
    }

    return NextResponse.json({
      success: true,
      message: 'Poll created successfully',
      data: poll,
    })
  } catch (error) {
    console.error('Create poll error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create poll',
      },
      { status: 500 }
    )
  }
}
