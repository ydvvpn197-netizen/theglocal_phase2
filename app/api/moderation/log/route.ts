import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/moderation/log - Get public moderation log
export const GET = withRateLimit(async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const communityId = searchParams.get('community_id')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Use the public moderation log function for privacy
    const { data, error } = await supabase.rpc('get_public_moderation_log', {
      p_community_id: communityId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error

    // Apply action filter if specified
    interface ModerationLogEntry {
      action: string
      [key: string]: unknown
    }
    let filteredData = (data || []) as ModerationLogEntry[]
    if (action && action !== 'all') {
      filteredData = filteredData.filter((log) => log.action === action)
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      meta: {
        community_id: communityId,
        action_filter: action,
        limit,
        offset,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/moderation/log' })
  }
})
