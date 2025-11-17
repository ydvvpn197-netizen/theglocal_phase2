/**
 * Web Vitals Analytics API Route
 *
 * Receives Web Vitals metrics from the client and stores/processes them.
 * This can be extended to send metrics to external services like:
 * - Google Analytics
 * - Vercel Analytics
 * - Sentry
 * - Custom database/logging service
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Metric } from 'web-vitals'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const runtime = 'nodejs' // Use nodejs runtime to support Redis rate limiting

export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/analytics/web-vitals')
  try {
    const body = await request.json()
    const { metric, page, user, timestamp } = body

    // Validate metric data
    if (!metric || !metric.name || metric.value === undefined) {
      throw APIErrors.badRequest('Invalid metric data')
    }

    // Log metric for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[Web Vitals] ${metric.name}: ${metric.value}`, {
        rating: metric.rating,
        page: page.pathname,
      })
    }

    // Store metric in database (optional)
    if (process.env.STORE_WEB_VITALS === 'true') {
      try {
        const supabase = await createClient()

        await supabase.from('web_vitals_metrics').insert({
          metric_name: metric.name,
          metric_value: metric.value,
          metric_rating: metric.rating,
          metric_delta: metric.delta,
          metric_id: metric.id,
          navigation_type: metric.navigationType,
          page_url: page.url,
          page_pathname: page.pathname,
          referrer: page.referrer,
          user_agent: user.userAgent,
          viewport_width: user.viewport?.width,
          viewport_height: user.viewport?.height,
          connection_type: user.connection?.effectiveType,
          connection_rtt: user.connection?.rtt,
          connection_downlink: user.connection?.downlink,
          timestamp: new Date(timestamp),
        })
      } catch (error) {
        // Log error but continue - metric storage is optional
        logger.warn('Failed to store web vitals metric', { error })
      }
    }

    // Forward to external services (optional)
    await forwardToExternalServices(metric, page, user)

    return createSuccessResponse(null, { success: true })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/analytics/web-vitals',
    })
  }
})

interface PageInfo {
  url: string
  pathname: string
  referrer?: string
}

interface UserInfo {
  userAgent?: string
  viewport?: { width?: number; height?: number }
  connection?: {
    effectiveType?: string
    rtt?: number
    downlink?: number
  }
}

/**
 * Forward metrics to external analytics services
 */
async function forwardToExternalServices(
  _metric: Metric,
  _page: PageInfo,
  _user: UserInfo
): Promise<void> {
  // Example: Send to Vercel Analytics
  // if (process.env.VERCEL_ANALYTICS_ID) {
  //   await fetch('https://vitals.vercel-insights.com/v1/vitals', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       dsn: process.env.VERCEL_ANALYTICS_ID,
  //       id: metric.id,
  //       page: page.pathname,
  //       href: page.url,
  //       event_name: metric.name,
  //       value: metric.value,
  //       speed: user.connection?.effectiveType,
  //     }),
  //   })
  // }
  // Example: Send to Sentry
  // if (process.env.SENTRY_DSN) {
  //   await fetch('https://sentry.io/api/0/envelope/', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/x-sentry-envelope',
  //     },
  //     body: JSON.stringify({
  //       // Sentry envelope format
  //     }),
  //   })
  // }
  // Example: Send to custom logging service
  // if (process.env.CUSTOM_ANALYTICS_ENDPOINT) {
  //   await fetch(process.env.CUSTOM_ANALYTICS_ENDPOINT, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${process.env.CUSTOM_ANALYTICS_TOKEN}`,
  //     },
  //     body: JSON.stringify({ metric, page, user }),
  //   })
  // }
}
