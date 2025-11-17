import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, APIErrors, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/users/[handle] - Fetch public profile by anonymous handle
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params

    if (!handle) {
      throw APIErrors.badRequest('Handle is required')
    }

    const supabase = await createClient()

    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        'id, anonymous_handle, avatar_seed, location_city, bio, created_at, deleted_at, display_preferences'
      )
      .eq('anonymous_handle', handle)
      .single()

    if (userError || !user) {
      throw APIErrors.notFound('User')
    }

    // Check if user is deleted
    if (user.deleted_at) {
      throw APIErrors.notFound('User')
    }

    // Get user statistics using database functions
    const { data: stats } = await supabase.rpc('get_user_post_karma', {
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
    const { data: artist } = await supabase
      .from('artists')
      .select('id, stage_name, service_category, subscription_status')
      .eq('id', user.id)
      .single()

    // Check if user has any admin/moderator roles
    const { data: roles } = await supabase
      .from('community_members')
      .select('role, community:communities(name, slug)')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])

    const profile = {
      id: user.id,
      anonymous_handle: user.anonymous_handle,
      avatar_seed: user.avatar_seed,
      location_city: user.display_preferences?.show_location ? user.location_city : null,
      bio: user.bio,
      created_at: user.created_at,
      display_preferences: user.display_preferences,
      stats: {
        post_karma: stats || 0,
        comment_karma: commentKarma || 0,
        total_karma: (stats || 0) + (commentKarma || 0),
        post_count: postCount || 0,
        comment_count: commentCount || 0,
        community_count: communityCount || 0,
      },
      artist: artist
        ? {
            stage_name: artist.stage_name,
            service_category: artist.service_category,
            subscription_status: artist.subscription_status,
          }
        : null,
      roles: roles || [],
    }

    return createSuccessResponse(profile)
  } catch (error) {
    const { handle: errorHandle } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/users/${errorHandle}`,
    })
  }
})
