import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireSuperAdminOrCommunityAdminModerator,
  AdminAccessDeniedError,
} from '@/lib/utils/admin-verification'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/reports/[id] - Get report details (admin/moderator only)
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Fetch report first to get community_id for verification
    const { data: report, error } = await supabase
      .from('reports')
      .select(
        `
        *,
        users!reports_reporter_id_fkey(anonymous_handle),
        communities(name)
      `
      )
      .eq('id', id)
      .single()

    if (error) throw error

    if (!report) {
      throw APIErrors.notFound('Report')
    }

    // Verify user is super admin OR admin/moderator of the report's community
    try {
      await requireSuperAdminOrCommunityAdminModerator(user.id, report.community_id || null)
    } catch (error) {
      if (error instanceof AdminAccessDeniedError) {
        throw APIErrors.forbidden()
      }
      throw error
    }

    return createSuccessResponse(report)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/reports/${id}`,
    })
  }
})

// PUT /api/reports/[id] - Resolve report (admin/moderator only)
export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { status, resolution_note } = body

    if (!['pending', 'reviewed', 'dismissed', 'actioned'].includes(status)) {
      throw APIErrors.badRequest('Invalid status')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Fetch report first to get community_id for verification
    const { data: existingReport, error: fetchError } = await supabase
      .from('reports')
      .select('community_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (!existingReport) {
      throw APIErrors.notFound('Report')
    }

    // Verify user is super admin OR admin/moderator of the report's community
    try {
      await requireSuperAdminOrCommunityAdminModerator(user.id, existingReport.community_id || null)
    } catch (error) {
      if (error instanceof AdminAccessDeniedError) {
        throw APIErrors.forbidden()
      }
      throw error
    }

    // Update report
    const { data: report, error: updateError } = await supabase
      .from('reports')
      .update({
        status,
        resolution_note,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return createSuccessResponse(report, {
      message: 'Report resolved successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/reports/${id}`,
    })
  }
})
