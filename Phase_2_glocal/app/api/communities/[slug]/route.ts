import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params
    const supabase = await createClient()

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()

    if (communityError) throw communityError

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    // Check if user is a member
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let isMember = false
    let isAdmin = false

    if (user) {
      const { data: membership } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single()

      isMember = !!membership
      isAdmin = membership?.role === 'admin' || membership?.role === 'moderator'
    }

    return NextResponse.json({
      success: true,
      data: {
        community,
        isMember,
        isAdmin,
      },
    })
  } catch (error) {
    console.error('Fetch community error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch community',
      },
      { status: 500 }
    )
  }
}
