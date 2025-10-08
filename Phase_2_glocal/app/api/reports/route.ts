import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createReportSchema } from '@/lib/utils/validation'
import { RATE_LIMITS } from '@/lib/utils/constants'

// GET /api/reports - List reports (admin/moderators only)
export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      data: reports || [],
    })
  } catch (error) {
    console.error('Fetch reports error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch reports',
      },
      { status: 500 }
    )
  }
}

// POST /api/reports - Submit a report
export async function POST(request: NextRequest) {
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
      console.error('Error checking report rate limit:', countError)
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
      communityId = comment?.posts?.community_id || null
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
      console.error('Database error creating report:', createError)
      throw createError
    }

    // TODO: Task 5.1.7 - Send notification to community admin and super admin
    // This will be implemented when notification system is built

    return NextResponse.json(
      {
        success: true,
        message: 'Report submitted successfully',
        data: report,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    console.error('Create report error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to submit report',
      },
      { status: 500 }
    )
  }
}

