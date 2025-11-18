import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/locations - List user's saved locations
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Return empty array for unauthenticated users (matches /api/feed pattern)
    if (!user) {
      return createSuccessResponse([])
    }

    // Fetch user's saved locations
    const { data: locations, error } = await supabase
      .from('user_saved_locations')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return createSuccessResponse(locations || [])
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/v2/locations' })
  }
})
/**
 * POST /api/v2/locations - Save a new location
 */
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  try {
    const body = await _request.json()
    const { location_name, location_city, latitude, longitude, is_primary } = body

    if (!location_name || !location_city || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'location_name, location_city, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Create PostGIS POINT
    const postgisPoint = `POINT(${longitude} ${latitude})`

    // If this is being set as primary, the trigger will unset other primary locations
    const { data: location, error: createError } = await supabase
      .from('user_saved_locations')
      .insert({
        user_id: user.id,
        location_name: location_name.trim(),
        location_city: location_city.trim(),
        location_coordinates: postgisPoint,
        is_primary: is_primary || false,
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json(
      {
        success: true,
        message: 'Location saved successfully',
        data: location,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/v2/locations' })
  }
})
/**
 * DELETE /api/v2/locations - Delete a saved location
 */
export const DELETE = withRateLimit(async function DELETE(_request: NextRequest) {
  try {
    const searchParams = _request.nextUrl.searchParams
    const locationId = searchParams.get('id')

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify ownership before deleting
    const { data: location } = await supabase
      .from('user_saved_locations')
      .select('id, user_id')
      .eq('id', locationId)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    if (location.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the location
    const { error: deleteError } = await supabase
      .from('user_saved_locations')
      .delete()
      .eq('id', locationId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully',
    })
  } catch (error) {
    return handleAPIError(error, { method: 'DELETE', path: '/api/v2/locations' })
  }
})
