import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/v2/locations/[id]/set-primary - Set a saved location as primary
 */
export const PUT = withRateLimit(async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const locationId = id
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify ownership
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

    // Set as primary (trigger will automatically unset other primary locations)
    const { data: updatedLocation, error: updateError } = await supabase
      .from('user_saved_locations')
      .update({ is_primary: true })
      .eq('id', locationId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Primary location updated successfully',
      data: updatedLocation,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/v2/locations/${id}/set-primary`,
    })
  }
})
