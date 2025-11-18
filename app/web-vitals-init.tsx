/**
 * Web Vitals Initialization Component
 *
 * This component should be included in your root layout to
 * automatically start monitoring Core Web Vitals.
 */

'use client'

import { useEffect } from 'react'
import { initWebVitals } from '@/lib/monitoring/web-vitals'

interface WindowWithGtag extends Window {
  gtag?: (command: string, targetId: string, config?: Record<string, unknown>) => void
}

export function WebVitalsInit() {
  useEffect(() => {
    // Initialize Web Vitals monitoring
    initWebVitals({
      enabled: true,
      debug: process.env.NODE_ENV === 'development',
      analyticsEndpoint: '/api/analytics/web-vitals',
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1, // 10% sampling in prod, 100% in dev
      onMetric: (metric) => {
        // Optional: Send to external analytics (Google Analytics, Sentry, etc.)

        // Example: Google Analytics 4
        if (typeof window !== 'undefined') {
          const windowWithGtag = window as WindowWithGtag
          if (windowWithGtag.gtag) {
            windowWithGtag.gtag('event', metric.name, {
              value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
              metric_id: metric.id,
              metric_value: metric.value,
              metric_delta: metric.delta,
              metric_rating: metric.rating,
            })
          }
        }

        // Example: Send to Sentry
        // if (typeof window !== 'undefined' && window.Sentry) {
        //   window.Sentry.addBreadcrumb({
        //     category: 'web-vitals',
        //     message: `${metric.name}: ${metric.value}`,
        //     level: metric.rating === 'poor' ? 'warning' : 'info',
        //     data: {
        //       value: metric.value,
        //       rating: metric.rating,
        //       delta: metric.delta,
        //     },
        //   })
        // }
      },
    })
  }, [])

  return null
}
