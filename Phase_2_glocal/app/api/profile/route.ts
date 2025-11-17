import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateBio } from '@/lib/utils/profile-helpers'
import { handleAPIError, APIErrors, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/profile - Fetch current user's full profile
export const GET = withRateLimit(async function GET() {
  const _logger = createAPILogger('GET', '/api/profile')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Fetch user profile with all details
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw APIErrors.notFound('Profile')
    }

    // Get user statistics
    const { data: postKarma } = await supabase.rpc('get_user_post_karma', {
      user_uuid: user.id,
    })

    const { data: commentKarma } = await supabase.rpc('get_user_comment_karma', {
      user_uuid: user.id,
    })

    const { data: postCount } = await supabase.rpc('get_user_post_count', {
      user_uuid: user.id,
    })

    const { data: commentCount } = await supabase.rpc('get_user_comment_count', {
      user_uuid: user.id,
    })

    const { data: communityCount } = await supabase.rpc('get_user_community_count', {
      user_uuid: user.id,
    })

    // Check if user is an artist
    const { data: artist } = await supabase.from('artists').select('*').eq('id', user.id).single()

    // Get user's community roles
    const { data: roles } = await supabase
      .from('community_members')
      .select('role, community:communities(id, name, slug)')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])

    // Get recent bookings (if any)
    const { data: bookings } = await supabase
      .from('bookings')
      .select(
        `
        id,
        event_date,
        event_type,
        status,
        created_at,
        artist:artists(stage_name, service_category)
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get reports made by user (count only for privacy)
    const { count: reportsCount } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('reported_by', user.id)

    const fullProfile = {
      ...profile,
      stats: {
        post_karma: postKarma || 0,
        comment_karma: commentKarma || 0,
        total_karma: (postKarma || 0) + (commentKarma || 0),
        post_count: postCount || 0,
        comment_count: commentCount || 0,
        community_count: communityCount || 0,
        reports_made: reportsCount || 0,
      },
      artist: artist || null,
      roles: roles || [],
      bookings: bookings || [],
    }

    return createSuccessResponse(fullProfile)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/profile' })
  }
})

// PUT /api/profile - Update current user's profile
export const PUT = withRateLimit(async function PUT(_request: NextRequest) {
  const _logger = createAPILogger('PUT', '/api/profile')
  try {
    const body = await _request.json()
    const { bio, location_city, display_preferences } = body

    // Validate bio if provided
    if (bio !== undefined) {
      const validation = validateBio(bio)
      if (!validation.valid) {
        throw APIErrors.badRequest(validation.error || 'Invalid bio')
      }
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (bio !== undefined) updates.bio = bio
    if (location_city !== undefined) updates.location_city = location_city
    if (display_preferences !== undefined) updates.display_preferences = display_preferences

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) throw updateError

    return createSuccessResponse(updatedProfile, {
      message: 'Profile updated successfully',
    })
  } catch (error) {
    return handleAPIError(error, { method: 'PUT', path: '/api/profile' })
  }
})
