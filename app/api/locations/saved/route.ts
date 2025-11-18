import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/locations/saved - Get user's saved locations
 *
 * @param _request - Next.js request
 * @returns List of saved locations
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/locations/saved')

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Fetching saved locations', { userId: user.id })

    // Fetch saved locations
    const { data: savedLocations, error } = await supabase
      .from('user_saved_locations')
      .select(
        'id, location_name, location_city, location_coordinates, is_primary, created_at, updated_at'
      )
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform coordinates from PostGIS format
    const transformedLocations = (savedLocations || []).map((location) => {
      // Extract lat/lng from PostGIS POINT format
      // The coordinates are stored as GEOGRAPHY(POINT), which returns as a string like "POINT(lng lat)"
      let lat = 0
      let lng = 0

      if (location.location_coordinates) {
        // If it's already parsed, use it directly
        if (
          typeof location.location_coordinates === 'object' &&
          'coordinates' in location.location_coordinates
        ) {
          const coords = location.location_coordinates as { coordinates: [number, number] }
          lng = coords.coordinates[0]
          lat = coords.coordinates[1]
        } else if (typeof location.location_coordinates === 'string') {
          // Parse PostGIS POINT string format: "POINT(lng lat)"
          const match = location.location_coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/)
          if (match && match[1] && match[2]) {
            const parsedLng = parseFloat(match[1])
            const parsedLat = parseFloat(match[2])
            if (!isNaN(parsedLng) && !isNaN(parsedLat)) {
              lng = parsedLng
              lat = parsedLat
            }
          }
        }
      }

      return {
        id: location.id,
        location_name: location.location_name,
        location_city: location.location_city,
        coordinates: { lat, lng },
        is_primary: location.is_primary,
        created_at: location.created_at,
        updated_at: location.updated_at,
      }
    })

    logger.info('Saved locations fetched successfully', {
      userId: user.id,
      count: transformedLocations.length,
    })

    return createSuccessResponse(transformedLocations)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/locations/saved',
    })
  }
})

/**
 * POST /api/locations/saved - Add a new saved location
 *
 * @param request - Next.js request with location data
 * @returns Created saved location
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/locations/saved')

  try {
    const body = await request.json()
    const { location_name, location_city, coordinates, is_primary } = body

    if (!location_name || !location_city || !coordinates) {
      throw APIErrors.badRequest('location_name, location_city, and coordinates are required')
    }

    if (!coordinates.lat || !coordinates.lng) {
      throw APIErrors.badRequest('coordinates must have lat and lng')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Creating saved location', {
      userId: user.id,
      location_name,
      location_city,
      is_primary: is_primary || false,
    })

    // Insert saved location
    // PostGIS POINT format: ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    const { data: savedLocation, error } = await supabase
      .from('user_saved_locations')
      .insert({
        user_id: user.id,
        location_name,
        location_city,
        location_coordinates: `POINT(${coordinates.lng} ${coordinates.lat})`,
        is_primary: is_primary || false,
      })
      .select(
        'id, location_name, location_city, location_coordinates, is_primary, created_at, updated_at'
      )
      .single()

    if (error) throw error

    // Transform coordinates
    let lat = 0
    let lng = 0
    if (savedLocation.location_coordinates) {
      if (
        typeof savedLocation.location_coordinates === 'object' &&
        'coordinates' in savedLocation.location_coordinates
      ) {
        const coords = savedLocation.location_coordinates as { coordinates: [number, number] }
        lng = coords.coordinates[0]
        lat = coords.coordinates[1]
      } else if (typeof savedLocation.location_coordinates === 'string') {
        const match = savedLocation.location_coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/)
        if (match && match[1] && match[2]) {
          const parsedLng = parseFloat(match[1])
          const parsedLat = parseFloat(match[2])
          if (!isNaN(parsedLng) && !isNaN(parsedLat)) {
            lng = parsedLng
            lat = parsedLat
          }
        }
      }
    }

    const transformedLocation = {
      id: savedLocation.id,
      location_name: savedLocation.location_name,
      location_city: savedLocation.location_city,
      coordinates: { lat, lng },
      is_primary: savedLocation.is_primary,
      created_at: savedLocation.created_at,
      updated_at: savedLocation.updated_at,
    }

    logger.info('Saved location created successfully', {
      locationId: savedLocation.id,
      userId: user.id,
    })

    return createSuccessResponse(transformedLocation, {
      message: 'Location saved successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/locations/saved',
    })
  }
})

/**
 * DELETE /api/locations/saved - Delete a saved location
 *
 * @param request - Next.js request with location ID
 * @returns Success response
 */
export const DELETE = withRateLimit(async function DELETE(request: NextRequest) {
  const logger = createAPILogger('DELETE', '/api/locations/saved')

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw APIErrors.badRequest('id parameter is required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Deleting saved location', { locationId: id, userId: user.id })

    // Verify ownership and delete
    const { error } = await supabase
      .from('user_saved_locations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    logger.info('Saved location deleted successfully', {
      locationId: id,
      userId: user.id,
    })

    return createSuccessResponse(null, {
      message: 'Location deleted successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: '/api/locations/saved',
    })
  }
})

/**
 * PATCH /api/locations/saved - Update a saved location (e.g., set as primary)
 *
 * @param request - Next.js request with update data
 * @returns Updated saved location
 */
export const PATCH = withRateLimit(async function PATCH(request: NextRequest) {
  const logger = createAPILogger('PATCH', '/api/locations/saved')

  try {
    const body = await request.json()
    const { id, is_primary, location_name, location_city, coordinates } = body

    if (!id) {
      throw APIErrors.badRequest('id is required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Updating saved location', {
      locationId: id,
      userId: user.id,
      updates: { is_primary, location_name, location_city, hasCoordinates: !!coordinates },
    })

    // Build update object
    const updateData: {
      is_primary?: boolean
      location_name?: string
      location_city?: string
      location_coordinates?: string
    } = {}

    if (is_primary !== undefined) {
      updateData.is_primary = is_primary
    }
    if (location_name !== undefined) {
      updateData.location_name = location_name
    }
    if (location_city !== undefined) {
      updateData.location_city = location_city
    }
    if (coordinates) {
      updateData.location_coordinates = `POINT(${coordinates.lng} ${coordinates.lat})`
    }

    // Update saved location
    const { data: updatedLocation, error } = await supabase
      .from('user_saved_locations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(
        'id, location_name, location_city, location_coordinates, is_primary, created_at, updated_at'
      )
      .single()

    if (error) throw error

    if (!updatedLocation) {
      throw APIErrors.notFound('Saved location')
    }

    // Transform coordinates
    let lat = 0
    let lng = 0
    if (updatedLocation.location_coordinates) {
      if (
        typeof updatedLocation.location_coordinates === 'object' &&
        'coordinates' in updatedLocation.location_coordinates
      ) {
        const coords = updatedLocation.location_coordinates as { coordinates: [number, number] }
        lng = coords.coordinates[0]
        lat = coords.coordinates[1]
      } else if (typeof updatedLocation.location_coordinates === 'string') {
        const match = updatedLocation.location_coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/)
        if (match && match[1] && match[2]) {
          const parsedLng = parseFloat(match[1])
          const parsedLat = parseFloat(match[2])
          if (!isNaN(parsedLng) && !isNaN(parsedLat)) {
            lng = parsedLng
            lat = parsedLat
          }
        }
      }
    }

    const transformedLocation = {
      id: updatedLocation.id,
      location_name: updatedLocation.location_name,
      location_city: updatedLocation.location_city,
      coordinates: { lat, lng },
      is_primary: updatedLocation.is_primary,
      created_at: updatedLocation.created_at,
      updated_at: updatedLocation.updated_at,
    }

    logger.info('Saved location updated successfully', {
      locationId: id,
      userId: user.id,
    })

    return createSuccessResponse(transformedLocation, {
      message: 'Location updated successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PATCH',
      path: '/api/locations/saved',
    })
  }
})
