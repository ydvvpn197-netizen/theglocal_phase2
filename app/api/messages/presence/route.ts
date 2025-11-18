import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PresenceResponse } from '@/lib/types/messages.types'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// POST /api/messages/presence - Update user's online status
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/messages/presence')
  try {
    const body = await _request.json()
    const { status } = body

    if (!status || !['online', 'away', 'offline'].includes(status)) {
      throw APIErrors.badRequest('Invalid status. Must be online, away, or offline')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Check if user exists in users table
    const { data: userRecord, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userCheckError || !userRecord) {
      logger.error('User record not found in users table:', {
        userId: user.id,
        error: userCheckError,
      })
      throw APIErrors.notFound('User profile not found. Please complete signup first.')
    }

    const now = new Date().toISOString()

    // Upsert presence record
    const { data: presence, error: presenceError } = await supabase
      .from('user_presence')
      .upsert(
        {
          user_id: user.id,
          status: status,
          last_seen_at: now,
          updated_at: now,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select(
        `
        *,
        user:users!user_presence_user_id_fkey(
          id,
          anonymous_handle,
          avatar_seed
        )
      `
      )
      .single()

    if (presenceError) {
      logger.error(
        'Error updating presence:',
        presenceError instanceof Error ? presenceError : undefined
      )
      throw presenceError
    }

    return createSuccessResponse(presence, { message: 'Presence updated' })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/messages/presence' })
  }
})
// GET /api/messages/presence - Get presence status for specific users
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/messages/presence')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Get query parameters
    const { searchParams } = new URL(_request.url)
    const userIds = searchParams.get('user_ids')

    if (!userIds) {
      throw APIErrors.badRequest('user_ids parameter is required')
    }

    // Parse user IDs (comma-separated)
    const userIdArray = userIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)

    if (userIdArray.length === 0) {
      throw APIErrors.badRequest('At least one user ID is required')
    }

    if (userIdArray.length > 50) {
      throw APIErrors.badRequest('Too many user IDs (max 50)')
    }

    // Fetch presence for specified users
    const { data: presenceRecords, error: presenceError } = await supabase
      .from('user_presence')
      .select(
        `
        *,
        user:users!user_presence_user_id_fkey(
          id,
          anonymous_handle,
          avatar_seed
        )
      `
      )
      .in('user_id', userIdArray)

    if (presenceError) {
      logger.error(
        'Error fetching presence:',
        presenceError instanceof Error ? presenceError : undefined
      )
      throw presenceError
    }

    // Create a map of user_id to presence record
    const presenceMap =
      presenceRecords?.reduce(
        (acc, record) => {
          acc[record.user_id] = record
          return acc
        },
        {} as Record<string, unknown>
      ) || {}

    // Fill in missing users with offline status
    const result = userIdArray.map((userId) => {
      if (presenceMap[userId]) {
        return presenceMap[userId]
      } else {
        return {
          user_id: userId,
          status: 'offline',
          last_seen_at: null,
          updated_at: null,
          user: null,
        }
      }
    })

    const response: PresenceResponse = {
      success: true,
      data: result,
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/messages/presence' })
  }
})
