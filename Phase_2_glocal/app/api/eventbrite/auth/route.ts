import { NextRequest, NextResponse } from 'next/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/eventbrite/auth
 *
 * Initiates the Eventbrite OAuth 2.0 flow
 * Admin-only endpoint to connect Eventbrite account
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    const clientId = process.env.EVENTBRITE_OAUTH_CLIENT_ID
    const redirectUri =
      process.env.EVENTBRITE_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/eventbrite/callback`

    if (!clientId) {
      return NextResponse.json(
        { error: 'Eventbrite OAuth not configured. Please set EVENTBRITE_OAUTH_CLIENT_ID.' },
        { status: 500 }
      )
    }

    // Build Eventbrite OAuth URL
    const authUrl = new URL('https://www.eventbrite.com/oauth/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)

    // Redirect to Eventbrite OAuth page
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/eventbrite/auth',
    })
  }
})
