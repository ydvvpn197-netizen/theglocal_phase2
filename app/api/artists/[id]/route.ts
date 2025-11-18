import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

const updateArtistSchema = z.object({
  stage_name: z.string().min(1).max(100).optional(),
  service_category: z.string().optional(),
  description: z.string().max(1000).optional(),
  location_city: z.string().optional(),
  rate_min: z.number().min(0).optional(),
  rate_max: z.number().min(0).optional(),
  portfolio_images: z.array(z.string()).max(10).optional(),
})

// GET /api/artists/[id] - Get artist profile
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/artists/[id]')
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: artist, error } = await supabase.from('artists').select('*').eq('id', id).single()

    if (error) throw error

    if (!artist) {
      throw APIErrors.notFound('Artist')
    }

    return createSuccessResponse(artist)
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/artists/${errorId}`,
    })
  }
})

// PUT /api/artists/[id] - Update artist profile
export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('PUT', '/api/artists/[id]')
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Verify artist ownership
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('user_id')
      .eq('id', id)
      .single()

    if (artistError || !artist) {
      throw APIErrors.notFound('Artist')
    }

    if (artist.user_id !== user.id) {
      throw APIErrors.forbidden()
    }

    const body = await request.json()
    const updates = updateArtistSchema.parse(body)

    // Update artist profile
    const { data: updatedArtist, error: updateError } = await supabase
      .from('artists')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return createSuccessResponse(updatedArtist, {
      message: 'Artist profile updated successfully',
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/artists/${errorId}`,
    })
  }
})

// DELETE /api/artists/[id] - Delete artist profile (soft delete by setting subscription to cancelled)
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('DELETE', '/api/artists/[id]')
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Verify artist ownership
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('user_id')
      .eq('id', id)
      .single()

    if (artistError || !artist) {
      throw APIErrors.notFound('Artist')
    }

    if (artist.user_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Soft delete by setting subscription to cancelled
    const { error: deleteError } = await supabase
      .from('artists')
      .update({
        subscription_status: 'cancelled',
        subscription_cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) throw deleteError

    return createSuccessResponse(null, {
      message: 'Artist profile deleted successfully',
    })
  } catch (error) {
    const { id: errorId } = await params
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/artists/${errorId}`,
    })
  }
})
