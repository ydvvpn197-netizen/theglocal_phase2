import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/utils/permissions'

// GET /api/admin/artists - List all artists with subscription info
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

    // Get filter parameters
    const statusFilter = request.nextUrl.searchParams.get('status')

    let query = supabase
      .from('artists')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('subscription_status', statusFilter)
    }

    const { data: artists, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: artists,
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
