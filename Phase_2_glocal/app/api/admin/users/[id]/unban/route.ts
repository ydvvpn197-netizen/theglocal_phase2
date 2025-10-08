import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'

// PUT /api/admin/users/[id]/unban - Unban a user
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify super admin
    const isAdmin = await isSuperAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Update user to remove ban
    const { data: unbannedUser, error: unbanError } = await supabase
      .from('users')
      .update({
        is_banned: false,
        ban_expires_at: null,
        ban_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (unbanError) throw unbanError

    // Log the unban action
    await supabase.from('moderation_log').insert({
      action: 'unban_user',
      actor_id: user.id,
      target_type: 'user',
      target_id: params.id,
      details: { reason: 'Manual unban by super admin' },
    })

    return NextResponse.json({
      success: true,
      message: 'User unbanned successfully',
      data: unbannedUser,
    })
  } catch (error) {
    console.error('Unban user error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to unban user',
      },
      { status: 500 }
    )
  }
}
