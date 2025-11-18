import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/v2/locations/[id] - Update a saved location
 */
export const PUT = withRateLimit(async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const locationId = id
    const body = await _request.json()
    const { location_name, location_city, latitude, longitude, is_primary } = body

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify ownership
    const { data: existingLocation } = await supabase
      .from('user_saved_locations')
      .select('id, user_id')
      .eq('id', locationId)
      .single()

    if (!existingLocation) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    if (existingLocation.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object
    interface LocationUpdateData {
      location_name?: string
      location_city?: string
      location_coordinates?: string
      is_primary?: boolean
    }
    const updateData: LocationUpdateData = {}

    if (location_name !== undefined) {
      updateData.location_name = location_name.trim()
    }

    if (location_city !== undefined) {
      updateData.location_city = location_city.trim()
    }

    if (latitude !== undefined && longitude !== undefined) {
      updateData.location_coordinates = `POINT(${longitude} ${latitude})`
    }

    if (is_primary !== undefined) {
      updateData.is_primary = is_primary
    }

    // Update the location
    const { data: updatedLocation, error: updateError } = await supabase
      .from('user_saved_locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      data: updatedLocation,
    })
  } catch (error) {
    const { id: errorLocationId } = await params
    return handleAPIError(error, { method: 'PUT', path: `/api/v2/locations/${errorLocationId}` })
  }
})

/**
 * DELETE /api/v2/locations/[id] - Delete a saved location
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const locationId = id
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
    const { id: errorLocationId } = await params
    return handleAPIError(error, { method: 'DELETE', path: `/api/v2/locations/${errorLocationId}` })
  }
})
