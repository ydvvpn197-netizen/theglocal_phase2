/**
 * Cron Job Authentication Utility
 *
 * Validates cron job requests using CRON_SECRET
 * In development (when CRON_SECRET is not set), allows all requests
 * In production (when CRON_SECRET is set), requires valid authorization
 */

import { env, isDevelopment } from '@/lib/config/env'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

/**
 * Verify cron job authentication
 * Returns true if authorized, false otherwise
 */
export function verifyCronAuth(request: NextRequest): boolean {
  // In development without CRON_SECRET, allow all cron requests
  if (isDevelopment && !env.CRON_SECRET) {
    logger.debug('Cron auth: Development mode without CRON_SECRET, allowing request')
    return true
  }

  // If CRON_SECRET is set, require it in authorization header
  if (env.CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    const isValid = authHeader === `Bearer ${env.CRON_SECRET}`

    if (!isValid) {
      logger.warn('Cron auth: Invalid or missing CRON_SECRET', {
        hasAuthHeader: !!authHeader,
        path: request.nextUrl.pathname,
      })
    }

    return isValid
  }

  // No CRON_SECRET configured, allow request (should not happen in production)
  logger.warn('Cron auth: No CRON_SECRET configured, allowing request')
  return true
}

/**
 * Create unauthorized response for cron jobs
 */
export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid CRON_SECRET required in Authorization header',
    },
    { status: 401 }
  )
}

/**
 * Middleware function to protect cron routes
 * Usage: const authResult = await protectCronRoute(request)
 *        if (authResult) return authResult // Returns 401 response
 */
export function protectCronRoute(request: NextRequest): NextResponse | null {
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }
  return null
}
