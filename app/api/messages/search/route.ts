import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UserSearchResponse, User } from '@/lib/types/messages.types'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/messages/search - Search users by handle
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/messages/search')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(_request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Search users by anonymous_handle
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(
        `
        id,
        anonymous_handle,
        avatar_seed,
        location_city,
        join_date
      `
      )
      .ilike('anonymous_handle', `%${query.trim()}%`)
      .neq('id', user.id) // Exclude current user
      .eq('is_banned', false) // Exclude banned users
      .order('anonymous_handle')
      .limit(limit)

    if (usersError) {
      logger.error('Error searching users:', usersError instanceof Error ? usersError : undefined)
      throw usersError
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .ilike('anonymous_handle', `%${query.trim()}%`)
      .neq('id', user.id)
      .eq('is_banned', false)

    const response: UserSearchResponse = {
      success: true,
      data: (users || []) as User[],
      meta: {
        total: totalCount || 0,
        query: query.trim(),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/messages/search' })
  }
})
