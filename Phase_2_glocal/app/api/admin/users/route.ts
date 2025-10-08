import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
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

    // Fetch all users with ban info
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, anonymous_handle, created_at, is_banned, ban_expires_at, ban_reason')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: users,
    })
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      },
      { status: 500 }
    )
  }
}
