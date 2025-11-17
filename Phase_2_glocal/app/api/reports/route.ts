import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createReportSchema } from '@/lib/utils/validation'
import { RATE_LIMITS } from '@/lib/utils/constants'
import { createNotification } from '@/lib/utils/notifications'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/reports - List reports (admin/moderators only)
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/reports')
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const contentType = searchParams.get('content_type')
    const communityId = searchParams.get('community_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // TODO: Check if user is admin or moderator (implement in next tasks)
    // For now, users can only see their own reports

    let query = supabase
      .from('reports')
      .select('*, users!reports_reporter_id_fkey(anonymous_handle)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    if (communityId) {
      query = query.eq('community_id', communityId)
    }

    const { data: reports, error } = await query

    if (error) throw error

    return createSuccessResponse(reports || [])
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/reports' })
  }
})
// POST /api/reports - Submit a report
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/reports')
  try {
    const body = await request.json()

    // Validate input
    const validatedData = createReportSchema.parse(body)
    const { content_type, content_id, reason, additional_context } = validatedData

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limiting: Check reports submitted in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentReports, error: countError } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .gte('created_at', oneDayAgo)

    if (countError) {
      logger.error('Error checking report rate limit:', countError)
    }

    if (recentReports && recentReports.length >= RATE_LIMITS.REPORTS_PER_DAY) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You can only submit ${RATE_LIMITS.REPORTS_PER_DAY} reports per day`,
        },
        { status: 429 }
      )
    }

    // Check if user already reported this content
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('content_type', content_type)
      .eq('content_id', content_id)
      .single()

    if (existingReport) {
      return NextResponse.json(
        {
          error: 'Already reported',
          message: 'You have already reported this content',
        },
        { status: 400 }
      )
    }

    // Get community_id based on content type
    let communityId: string | null = null

    if (content_type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('community_id')
        .eq('id', content_id)
        .single()
      communityId = post?.community_id || null
    } else if (content_type === 'comment') {
      const { data: comment } = await supabase
        .from('comments')
        .select('posts!inner(community_id)')
        .eq('id', content_id)
        .single()
      const commentPosts = comment?.posts as { community_id?: string } | undefined
      communityId =
        (Array.isArray(commentPosts)
          ? commentPosts[0]?.community_id
          : commentPosts?.community_id) || null
    } else if (content_type === 'poll') {
      const { data: poll } = await supabase
        .from('polls')
        .select('community_id')
        .eq('id', content_id)
        .single()
      communityId = poll?.community_id || null
    }

    // Create report
    const { data: report, error: createError } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        content_type,
        content_id,
        community_id: communityId,
        reason,
        additional_context,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      logger.error('Database error creating report:', createError)
      throw createError
    }

    // Send notification to community admins and super admins
    try {
      const adminSupabase = createAdminClient()
      const adminUserIds = new Set<string>()

      // Get community admins if communityId exists
      if (communityId) {
        const { data: communityAdmins } = await adminSupabase
          .from('community_members')
          .select('user_id')
          .eq('community_id', communityId)
          .eq('role', 'admin')

        if (communityAdmins) {
          communityAdmins.forEach((admin) => {
            if (admin.user_id) {
              adminUserIds.add(admin.user_id)
            }
          })
        }
      }

      // Get super admins
      // Query by is_super_admin flag
      const { data: superAdminsByFlag } = await adminSupabase
        .from('users')
        .select('id')
        .eq('is_super_admin', true)

      if (superAdminsByFlag) {
        superAdminsByFlag.forEach((admin) => {
          if (admin.id) {
            adminUserIds.add(admin.id)
          }
        })
      }

      // Also check SUPER_ADMIN_EMAILS env var
      const superAdminEmails =
        process.env.SUPER_ADMIN_EMAILS?.split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean) || []

      if (superAdminEmails.length > 0) {
        const { data: superAdminsByEmail } = await adminSupabase
          .from('users')
          .select('id')
          .in('email', superAdminEmails)

        if (superAdminsByEmail) {
          superAdminsByEmail.forEach((admin) => {
            if (admin.id) {
              adminUserIds.add(admin.id)
            }
          })
        }
      }

      // Create notifications for all admins
      const notificationPromises = Array.from(adminUserIds).map((adminUserId) =>
        createNotification(adminSupabase, {
          userId: adminUserId,
          type: 'content_reported',
          title: 'New content report',
          message: `A ${content_type} has been reported: ${reason}`,
          link: `/admin/reports/${report.id}`,
          actorId: user.id,
          entityId: report.id,
          entityType: 'report',
        })
      )

      await Promise.allSettled(notificationPromises)
    } catch (error) {
      return handleAPIError(error, { method: 'POST', path: '/api/reports' })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Report submitted successfully',
        data: report,
      },
      { status: 201 }
    )
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ZodError' &&
      'errors' in error
    ) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: (error as { errors: unknown }).errors,
        },
        { status: 400 }
      )
    }

    logger.error('Create report error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to submit report',
      },
      { status: 500 }
    )
  }
})
