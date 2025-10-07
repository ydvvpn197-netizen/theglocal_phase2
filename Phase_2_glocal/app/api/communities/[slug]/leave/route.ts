import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_request: NextRequest, { params }: { params: { slug: string } }) {
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
      .select('id, name, created_by')
      .eq('slug', slug)
      .single()

    if (communityError) throw communityError

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    // Prevent creator from leaving (they must transfer ownership first)
    if (community.created_by === user.id) {
      return NextResponse.json(
        {
          error:
            'Community creators cannot leave. Delete the community or transfer ownership first.',
        },
        { status: 403 }
      )
    }

    // Leave community
    const { error: leaveError } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('user_id', user.id)

    if (leaveError) throw leaveError

    return NextResponse.json({
      success: true,
      message: `Left ${community.name} successfully`,
    })
  } catch (error) {
    console.error('Leave community error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to leave community',
      },
      { status: 500 }
    )
  }
}
