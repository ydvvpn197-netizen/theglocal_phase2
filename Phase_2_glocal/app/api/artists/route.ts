import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/artists - List artists
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    let query = supabase
      .from('artists')
      .select('*')
      .in('subscription_status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (city) {
      query = query.eq('location_city', city)
    }

    if (category && category !== 'all') {
      query = query.eq('service_category', category)
    }

    // Search functionality
    if (search) {
      query = query.or(
        `stage_name.ilike.%${search}%,description.ilike.%${search}%,service_category.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Fetch artists error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch artists',
      },
      { status: 500 }
    )
  }
}

// POST /api/artists - Create artist profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stage_name,
      service_category,
      description,
      location_city,
      rate_min,
      rate_max,
      portfolio_images,
    } = body

    if (!stage_name || !service_category || !location_city) {
      return NextResponse.json(
        { error: 'stage_name, service_category, and location_city are required' },
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

    // Check if user already has an artist profile
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingArtist) {
      return NextResponse.json({ error: 'You already have an artist profile' }, { status: 400 })
    }

    // Create artist profile
    const { data: artist, error: createError } = await supabase
      .from('artists')
      .insert({
        user_id: user.id,
        stage_name,
        service_category,
        description,
        location_city,
        rate_min,
        rate_max,
        portfolio_images,
        subscription_status: 'trial', // Start with trial status
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({
      success: true,
      message: 'Artist profile created successfully',
      data: artist,
    })
  } catch (error) {
    console.error('Create artist error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create artist profile',
      },
      { status: 500 }
    )
  }
}
