import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/communities/[slug]/members - Get community members
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = await createClient()

    // Get community by slug
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', params.slug)
      .single()

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    // Get members with user info
    const { data: members, error } = await supabase
      .from('community_members')
      .select('*, users!community_members_user_id_fkey(anonymous_handle)')
      .eq('community_id', community.id)
      .order('joined_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: members || [],
    })
  } catch (error) {
    console.error('Fetch members error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch members',
      },
      { status: 500 }
    )
  }
}

