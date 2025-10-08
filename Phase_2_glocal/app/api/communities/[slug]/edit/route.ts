import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/communities/[slug]/edit - Update community info (admin only)
export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await request.json()
    const { name, description, rules, is_private } = body

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
      .select('id')
      .eq('slug', params.slug)
      .single()

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    // Verify user is admin of this community
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only community admins can edit community info' },
        { status: 403 }
      )
    }

    // Update community
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (rules !== undefined) updateData.rules = rules
    if (is_private !== undefined) updateData.is_private = is_private
    updateData.updated_at = new Date().toISOString()

    const { data: updatedCommunity, error: updateError } = await supabase
      .from('communities')
      .update(updateData)
      .eq('id', community.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Community updated successfully',
      data: updatedCommunity,
    })
  } catch (error) {
    console.error('Update community error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update community',
      },
      { status: 500 }
    )
  }
}

