import { NextRequest, NextResponse } from 'next/server'
import { storeOAuthToken } from '@/lib/utils/oauth-manager'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/eventbrite/callback
 *
 * Handles the OAuth callback from Eventbrite
 * Exchanges authorization code for access token
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/eventbrite/callback')

  try {
    const searchParams = _request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      logger.error('[Eventbrite OAuth] Authorization error', undefined, { error })
      return NextResponse.redirect(
        new URL(`/admin/integrations?error=${encodeURIComponent(error)}`, _request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/integrations?error=no_code', _request.url))
    }

    const clientId = process.env.EVENTBRITE_OAUTH_CLIENT_ID
    const clientSecret = process.env.EVENTBRITE_OAUTH_CLIENT_SECRET
    const redirectUri =
      process.env.EVENTBRITE_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/eventbrite/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=oauth_not_configured', _request.url)
      )
    }

    // Exchange code for access token
    const tokenUrl = 'https://www.eventbrite.com/oauth/token'
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('[Eventbrite OAuth] Token exchange failed', undefined, { errorText })
      return NextResponse.redirect(
        new URL('/admin/integrations?error=token_exchange_failed', _request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Store the token in database
    await storeOAuthToken({
      platform: 'eventbrite',
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      metadata: {
        user_id: tokenData.user_id,
      },
    })

    logger.info('[Eventbrite OAuth] Successfully connected Eventbrite account')

    // Redirect back to admin page with success
    return NextResponse.redirect(
      new URL('/admin/integrations?success=eventbrite_connected', _request.url)
    )
  } catch (error) {
    logger.error('[Eventbrite OAuth] Callback error', error instanceof Error ? error : undefined)
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/eventbrite/callback',
    })
  }
})
