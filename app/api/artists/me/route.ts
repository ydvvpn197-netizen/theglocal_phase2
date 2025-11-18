import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/artists/me - Get current user's artist profile
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/artists/me')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get artist profile
    const { data: artist, error } = await supabase
      .from('artists')
      .select(
        'id, stage_name, service_category, description, location_city, rate_min, rate_max, portfolio_images, subscription_status, subscription_end_date, verification_status, created_at'
      )
      .eq('id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No artist profile found
        return NextResponse.json({
          success: true,
          artist: null,
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      artist,
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/artists/me' })
  }
})
