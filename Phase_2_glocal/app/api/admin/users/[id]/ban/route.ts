import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'
import { z } from 'zod'

const banUserSchema = z.object({
  duration: z.enum(['temporary', 'permanent']),
  reason: z.string().min(10, 'Ban reason must be at least 10 characters'),
})

// PUT /api/admin/users/[id]/ban - Ban a user
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

    const body = await request.json()
    const { duration, reason } = banUserSchema.parse(body)

    // Calculate ban expiry date
    let banExpiresAt: string | null = null
    if (duration === 'temporary') {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7) // 7 days from now
      banExpiresAt = expiryDate.toISOString()
    }

    // Update user ban status
    const { data: bannedUser, error: banError } = await supabase
      .from('users')
      .update({
        is_banned: true,
        ban_expires_at: banExpiresAt,
        ban_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (banError) throw banError

    // Log the ban action
    await supabase.from('moderation_log').insert({
      action: 'ban_user',
      actor_id: user.id,
      target_type: 'user',
      target_id: params.id,
      details: { duration, reason, ban_expires_at: banExpiresAt },
    })

    return NextResponse.json({
      success: true,
      message: `User ${duration === 'permanent' ? 'permanently' : 'temporarily'} banned`,
      data: bannedUser,
    })
  } catch (error) {
    console.error('Ban user error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to ban user',
      },
      { status: 500 }
    )
  }
}
