import { NextRequest, NextResponse } from 'next/server'
import { storeOAuthToken } from '@/lib/utils/oauth-manager'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/meetup/callback
 *
 * Handles the OAuth callback from Meetup.com
 * Exchanges authorization code for access token
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/meetup/callback')

  try {
    const searchParams = _request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      logger.error('[Meetup OAuth] Authorization error', undefined, { error })
      return NextResponse.redirect(
        new URL(`/admin/integrations?error=${encodeURIComponent(error)}`, _request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/integrations?error=no_code', _request.url))
    }

    const clientId = process.env.MEETUP_OAUTH_CLIENT_ID
    const clientSecret = process.env.MEETUP_OAUTH_CLIENT_SECRET
    const redirectUri =
      process.env.MEETUP_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/meetup/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=oauth_not_configured', _request.url)
      )
    }

    // Exchange code for access token
    const tokenUrl = 'https://secure.meetup.com/oauth2/access'
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('[Meetup OAuth] Token exchange failed', undefined, { errorText })
      return NextResponse.redirect(
        new URL('/admin/integrations?error=token_exchange_failed', _request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Store the token in database
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    await storeOAuthToken({
      platform: 'meetup',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      token_type: tokenData.token_type || 'Bearer',
      metadata: {
        member_id: tokenData.member_id,
      },
    })

    logger.info('[Meetup OAuth] Successfully connected Meetup account')

    // Redirect back to admin page with success
    return NextResponse.redirect(
      new URL('/admin/integrations?success=meetup_connected', _request.url)
    )
  } catch (error) {
    logger.error('[Meetup OAuth] Callback error', error instanceof Error ? error : undefined)
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/meetup/callback',
    })
  }
})
