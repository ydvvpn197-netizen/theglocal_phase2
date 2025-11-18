import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geocodeCity, updateRecordCoordinates, queueGeocoding } from '@/lib/utils/geocoding'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/geocoding/process - Process a single geocoding request
// Called by database triggers when records are created/updated
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/geocoding/process')
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.GEOCODING_WEBHOOK_SECRET}`) {
      throw APIErrors.unauthorized()
    }

    const body = await request.json()
    const { table_name, record_id, city } = body

    // Validate inputs
    if (!table_name || !record_id || !city) {
      throw APIErrors.badRequest('table_name, record_id, and city are required')
    }

    const validTables = ['users', 'communities', 'posts', 'artists', 'events', 'polls']
    if (!validTables.includes(table_name)) {
      throw APIErrors.badRequest('Invalid table_name')
    }

    const supabase = await createClient()

    // Verify record exists and needs geocoding
    const { data: record, error: fetchError } = await supabase
      .from(table_name)
      .select('id, location_city, location_coordinates')
      .eq('id', record_id)
      .single()

    if (fetchError || !record) {
      logger.error(`Record not found: ${table_name}.${record_id}`, fetchError)
      throw APIErrors.notFound('Record not found')
    }

    // Check if already has coordinates
    if (record.location_coordinates) {
      logger.info(`Record ${table_name}.${record_id} already has coordinates`)
      return NextResponse.json({
        success: true,
        message: 'Record already has coordinates',
      })
    }

    // Try to geocode immediately
    const geocoded = await geocodeCity(city)

    if (geocoded) {
      // Update coordinates
      const updateResult = await updateRecordCoordinates(supabase, table_name, record_id, geocoded)

      if (updateResult.success) {
        logger.info(`✓ Geocoded ${table_name}.${record_id}: ${city}`)
        return createSuccessResponse(geocoded)
      } else {
        // Database update failed, queue for retry
        logger.warn(`Failed to update ${table_name}.${record_id}, queueing for retry`)
        await queueGeocoding(supabase, table_name, record_id, city)
        return NextResponse.json({
          success: false,
          message: 'Geocoded but update failed, queued for retry',
          error: updateResult.error,
        })
      }
    } else {
      // Geocoding failed, queue for retry
      logger.warn(`Geocoding failed for ${city}, queueing for retry`)
      await queueGeocoding(supabase, table_name, record_id, city)
      return NextResponse.json({
        success: false,
        message: 'Geocoding failed, queued for retry',
      })
    }
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/geocoding/process' })
  }
})

// GET /api/geocoding/process - Health check
export const GET = withRateLimit(async function GET() {
  try {
    const logger = createAPILogger('GET', '/api/geocoding/process')
    return NextResponse.json({
      status: 'ok',
      service: 'geocoding-process',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/geocoding/process',
    })
  }
})
