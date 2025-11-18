import { NextRequest, NextResponse } from 'next/server'
// import { fetchBookMyShowEvents } from '@/lib/integrations/event-sources/bookmyshow'
import { fetchInsiderEvents } from '@/lib/integrations/event-sources/insider'
import { fetchAlleventsEvents } from '@/lib/integrations/event-sources/allevents'
import type { FetchConfig } from '@/lib/integrations/event-sources/types'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

interface PlatformHealth {
  platform: string
  status: 'healthy' | 'degraded' | 'down'
  eventCount: number
  responseTime: number
  error?: string
  lastChecked: string
}

/**
 * GET /api/events/health - Check health of all event platforms
 *
 * Tests each platform scraper to verify it's working correctly
 * Returns status for monitoring and debugging
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/health')
  try {
    const searchParams = _request.nextUrl.searchParams
    const city = searchParams.get('city') || 'Mumbai'

    logger.info(`Running platform health check for ${city}...`)

    const testConfig: FetchConfig = {
      city,
      limit: 5, // Small limit for quick health check
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
    }

    // Test all platforms in parallel
    const results = await Promise.allSettled([
      // testPlatform('bookmyshow', () => fetchBookMyShowEvents(testConfig)), // Temporarily disabled - file missing
      testPlatform('insider', () => fetchInsiderEvents(testConfig)),
      testPlatform('allevents', () => fetchAlleventsEvents(testConfig)),
    ])

    const platformHealth: PlatformHealth[] = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          platform: 'unknown',
          status: 'down' as const,
          eventCount: 0,
          responseTime: 0,
          error: result.reason?.message || 'Unknown error',
          lastChecked: new Date().toISOString(),
        }
      }
    })

    // Calculate overall status
    const allHealthy = platformHealth.every((p) => p.status === 'healthy')
    const anyHealthy = platformHealth.some((p) => p.status === 'healthy')
    const overallStatus = allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'down'

    // Count statuses
    const healthy = platformHealth.filter((p) => p.status === 'healthy').length
    const degraded = platformHealth.filter((p) => p.status === 'degraded').length
    const down = platformHealth.filter((p) => p.status === 'down').length

    return NextResponse.json({
      success: true,
      overallStatus,
      timestamp: new Date().toISOString(),
      city,
      summary: {
        total: platformHealth.length,
        healthy,
        degraded,
        down,
      },
      platforms: platformHealth,
      recommendations: generateRecommendations(platformHealth),
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/health' })
  }
})
/**
 * Test a single platform
 */
async function testPlatform(
  platformName: string,
  fetchFunction: () => Promise<unknown>
): Promise<PlatformHealth> {
  const startTime = Date.now()

  try {
    const result = (await fetchFunction()) as {
      success: boolean
      events: unknown[]
      error?: string
    }
    const responseTime = Date.now() - startTime

    // Determine status based on results
    let status: 'healthy' | 'degraded' | 'down'

    if (result.success && result.events.length > 0) {
      status = 'healthy'
    } else if (result.success && result.events.length === 0) {
      status = 'degraded' // Returns successfully but no events found
    } else {
      status = 'down'
    }

    return {
      platform: platformName,
      status,
      eventCount: result.events.length,
      responseTime,
      error: result.error,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      platform: platformName,
      status: 'down',
      eventCount: 0,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Generate recommendations based on platform health
 */
function generateRecommendations(platforms: PlatformHealth[]): string[] {
  const recommendations: string[] = []

  platforms.forEach((platform) => {
    if (platform.status === 'down') {
      recommendations.push(
        `${platform.platform}: Platform is down. Error: ${platform.error || 'Unknown'}. Check scraper code and website accessibility.`
      )
    } else if (platform.status === 'degraded') {
      recommendations.push(
        `${platform.platform}: Platform returns 0 events. May be blocking requests (HTTP 403), selectors outdated, or no events available for the city.`
      )
    }
  })

  // Check for slow platforms
  platforms.forEach((platform) => {
    if (platform.responseTime > 10000) {
      recommendations.push(
        `${platform.platform}: Slow response time (${platform.responseTime}ms). Consider optimizing or adding timeout limits.`
      )
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('All platforms are healthy and functioning correctly.')
  }

  return recommendations
}
