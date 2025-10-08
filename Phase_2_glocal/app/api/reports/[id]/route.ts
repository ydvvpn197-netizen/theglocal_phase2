import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/reports/[id] - Get report details (admin/moderator only)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // TODO: Verify user is admin or moderator

    const { data: report, error } = await supabase
      .from('reports')
      .select(
        `
        *,
        users!reports_reporter_id_fkey(anonymous_handle),
        communities(name)
      `
      )
      .eq('id', params.id)
      .single()

    if (error) throw error

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error('Fetch report error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch report',
      },
      { status: 500 }
    )
  }
}

// PUT /api/reports/[id] - Resolve report (admin/moderator only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status, resolution_note } = body

    if (!['pending', 'reviewed', 'dismissed', 'actioned'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // TODO: Verify user is admin or moderator of the community

    // Update report
    const { data: report, error: updateError } = await supabase
      .from('reports')
      .update({
        status,
        resolution_note,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Report resolved successfully',
      data: report,
    })
  } catch (error) {
    console.error('Resolve report error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to resolve report',
      },
      { status: 500 }
    )
  }
}

