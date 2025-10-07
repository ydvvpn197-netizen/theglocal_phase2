import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/communities - List communities with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'all'
    const city = searchParams.get('city')

    const supabase = await createClient()

    let query = supabase
      .from('communities')
      .select('*')
      .eq('is_private', false) // Only public communities for now
      .order('created_at', { ascending: false })

    // Apply filters
    if (filter === 'popular') {
      query = query.order('member_count', { ascending: false })
    } else if (filter === 'nearby' && city) {
      query = query.eq('location_city', city)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Fetch communities error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch communities',
      },
      { status: 500 }
    )
  }
}

// POST /api/communities - Create a new community
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, rules, location_city, is_private } = body

    if (!name || !location_city) {
      return NextResponse.json({ error: 'Name and location_city are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Create community
    const { data: community, error: createError } = await supabase
      .from('communities')
      .insert({
        name,
        slug,
        description,
        rules,
        location_city,
        is_private: is_private || false,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      // Handle duplicate slug
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A community with this name already exists in your city' },
          { status: 409 }
        )
      }
      throw createError
    }

    // Add creator as admin member
    const { error: memberError } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'admin',
    })

    if (memberError) {
      // Rollback: delete community if member insert fails
      await supabase.from('communities').delete().eq('id', community.id)
      throw memberError
    }

    return NextResponse.json({
      success: true,
      message: 'Community created successfully',
      data: community,
    })
  } catch (error) {
    console.error('Create community error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create community',
      },
      { status: 500 }
    )
  }
}
