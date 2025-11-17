import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/notifications/preferences - Get user notification preferences
export const GET = withRateLimit(async function GET() {
  const logger = createAPILogger('GET', '/api/notifications/preferences')
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no preferences exist, create default ones
    if (error && error.code === 'PGRST116') {
      const { data: newPreferences, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (insertError) {
        logger.error(
          'Error creating default preferences:',
          insertError instanceof Error ? insertError : undefined
        )
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
      }

      preferences = newPreferences
    } else if (error) {
      logger.error('Error fetching preferences:', error instanceof Error ? error : undefined)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/notifications/preferences',
    })
  }
})

// PATCH /api/notifications/preferences - Update notification preferences
export const PATCH = withRateLimit(async function PATCH(_request: Request) {
  const logger = createAPILogger('PATCH', '/api/notifications/preferences')
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await _request.json()
    interface NotificationPreferencesUpdate {
      comments_on_post?: boolean
      comment_replies?: boolean
      post_votes?: boolean
      poll_votes?: boolean
      comment_votes?: boolean
      bookings?: boolean
      booking_requests?: boolean
      community_invites?: boolean
      artist_responses?: boolean
      event_reminders?: boolean
      direct_messages?: boolean
      booking_messages?: boolean
      mentions?: boolean
      moderation_actions?: boolean
      email_digest_enabled?: boolean
      email_digest_frequency?: 'daily' | 'weekly' | 'never'
      quiet_hours_enabled?: boolean
      quiet_hours_start?: string
      quiet_hours_end?: string
      quiet_hours_timezone?: string
      updated_at: string
    }
    const updates: Partial<NotificationPreferencesUpdate> & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    // Validate and sanitize input
    const booleanFields = [
      'comments_on_post',
      'comment_replies',
      'post_votes',
      'poll_votes',
      'comment_votes',
      'bookings',
      'booking_requests',
      'community_invites',
      'artist_responses',
      'event_reminders',
      'direct_messages',
      'booking_messages',
      'mentions',
      'moderation_actions',
      'email_digest_enabled',
      'quiet_hours_enabled',
    ]

    const stringFields = ['quiet_hours_start', 'quiet_hours_end', 'quiet_hours_timezone']

    // Validate boolean fields
    for (const field of booleanFields) {
      if (field in body && typeof body[field] === 'boolean') {
        ;(updates as Record<string, boolean | string>)[field] = body[field] as boolean
      }
    }

    // Validate email_digest_frequency
    if ('email_digest_frequency' in body) {
      const frequency = body.email_digest_frequency
      if (['daily', 'weekly', 'never'].includes(frequency)) {
        ;(updates as Record<string, boolean | string>).email_digest_frequency = frequency
      } else {
        return NextResponse.json(
          { error: 'Invalid email_digest_frequency. Must be daily, weekly, or never' },
          { status: 400 }
        )
      }
    }

    // Validate string fields (time format validation)
    for (const field of stringFields) {
      if (field in body && typeof body[field] === 'string') {
        const value = body[field] as string
        // Validate time format for quiet_hours_start and quiet_hours_end
        if ((field === 'quiet_hours_start' || field === 'quiet_hours_end') && value) {
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
          if (!timeRegex.test(value)) {
            return NextResponse.json(
              { error: `Invalid ${field} format. Must be HH:MM:SS (24-hour format)` },
              { status: 400 }
            )
          }
        }
        ;(updates as Record<string, boolean | string>)[field] = value
      }
    }

    if (Object.keys(updates).length === 1 && 'updated_at' in updates) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating preferences:', error instanceof Error ? error : undefined)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PATCH',
      path: '/api/notifications/preferences',
    })
  }
})
