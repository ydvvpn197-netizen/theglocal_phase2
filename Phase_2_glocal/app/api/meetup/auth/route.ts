import { NextRequest, NextResponse } from 'next/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/meetup/auth
 *
 * Initiates the Meetup OAuth 2.0 flow
 * Admin-only endpoint to connect Meetup.com account
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  try {
    const clientId = process.env.MEETUP_OAUTH_CLIENT_ID
    const redirectUri =
      process.env.MEETUP_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/meetup/callback`

    if (!clientId) {
      return NextResponse.json(
        { error: 'Meetup OAuth not configured. Please set MEETUP_OAUTH_CLIENT_ID.' },
        { status: 500 }
      )
    }

    // Build Meetup OAuth URL
    // Meetup uses OAuth 2.0 with authorization code flow
    const authUrl = new URL('https://secure.meetup.com/oauth2/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)

    // Redirect to Meetup OAuth page
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/meetup/auth',
    })
  }
})
