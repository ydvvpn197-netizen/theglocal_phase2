import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, is_private')
      .eq('slug', slug)
      .single()

    if (communityError) throw communityError

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already a member of this community' }, { status: 409 })
    }

    // Join community
    const { error: joinError } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'member',
    })

    if (joinError) throw joinError

    return NextResponse.json({
      success: true,
      message: `Joined ${community.name} successfully`,
    })
  } catch (error) {
    console.error('Join community error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to join community',
      },
      { status: 500 }
    )
  }
}
