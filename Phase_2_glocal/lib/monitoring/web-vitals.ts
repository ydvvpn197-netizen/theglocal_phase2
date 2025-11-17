/**
 * Web Vitals Monitoring
 *
 * Captures Core Web Vitals metrics and sends them to analytics/logging services.
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - INP (Interaction to Next Paint): Responsiveness
 * - TTFB (Time to First Byte): Server response time
 */

import type { Metric } from 'web-vitals'
import { logger } from '@/lib/utils/logger'

/**
 * Configuration for Web Vitals reporting
 */
export interface WebVitalsConfig {
  /** Enable reporting (default: true in production) */
  enabled?: boolean
  /** Debug mode - log to console (default: true in development) */
  debug?: boolean
  /** Send to analytics endpoint */
  analyticsEndpoint?: string
  /** Send to custom callback */
  onMetric?: (metric: Metric) => void
  /** Sample rate (0-1, default: 1 for 100%) */
  sampleRate?: number
}

const defaultConfig: WebVitalsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  analyticsEndpoint: '/api/analytics/web-vitals',
  sampleRate: 1, // 100% sampling by default
}

/**
 * Initialize Web Vitals monitoring
 * Call this once in your root layout or _app.tsx
 */
export async function initWebVitals(config: WebVitalsConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config }

  // Check if monitoring is enabled
  if (!finalConfig.enabled && !finalConfig.debug) {
    return
  }

  // Apply sampling
  if (Math.random() > (finalConfig.sampleRate ?? 1)) {
    return
  }

  // Dynamically import web-vitals to avoid loading in SSR
  if (typeof window === 'undefined') {
    return
  }

  const { onCLS, onLCP, onINP, onTTFB, onFCP } = await import('web-vitals')

  // Report handler
  const reportMetric = (metric: Metric) => {
    // Debug logging
    if (finalConfig.debug) {
      logger.info(`[Web Vitals] ${metric.name}`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        metric,
      })
    }

    // Send to custom callback
    if (finalConfig.onMetric) {
      finalConfig.onMetric(metric)
    }

    // Send to analytics endpoint
    if (finalConfig.analyticsEndpoint && finalConfig.enabled) {
      sendToAnalytics(finalConfig.analyticsEndpoint, metric)
    }
  }

  // Register all Core Web Vitals observers
  onCLS(reportMetric) // Cumulative Layout Shift
  // onFID removed - deprecated in favor of INP
  onLCP(reportMetric) // Largest Contentful Paint
  onINP(reportMetric) // Interaction to Next Paint
  onTTFB(reportMetric) // Time to First Byte
  onFCP(reportMetric) // First Contentful Paint
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(endpoint: string, metric: Metric) {
  try {
    // Prepare payload
    const body = JSON.stringify({
      metric: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      },
      page: {
        url: window.location.href,
        pathname: window.location.pathname,
        referrer: document.referrer,
      },
      user: {
        // Add user context if available
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: getConnectionInfo(),
      },
      timestamp: Date.now(),
    })

    // Use sendBeacon for reliability (fires even if page unloads)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body)
    } else {
      // Fallback to fetch with keepalive
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        keepalive: true, // Keep request alive even if page unloads
      }).catch((error) => {
        // Silently fail - don't block app
        logger.warn('[Web Vitals] Failed to send metric', {
          error: error instanceof Error ? error.message : String(error),
          endpoint,
        })
      })
    }
  } catch (error) {
    logger.warn('[Web Vitals] Failed to prepare metric', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

interface NetworkConnection {
  effectiveType?: string
  rtt?: number
  downlink?: number
  saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection
}

/**
 * Get network connection information
 */
function getConnectionInfo() {
  if (!('connection' in navigator)) {
    return null
  }

  const conn = (navigator as NavigatorWithConnection).connection
  return {
    effectiveType: conn?.effectiveType,
    rtt: conn?.rtt,
    downlink: conn?.downlink,
    saveData: conn?.saveData,
  }
}

/**
 * Get Web Vitals thresholds for rating
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2500, // <= 2.5s
    needsImprovement: 4000, // <= 4s
  },
  FID: {
    good: 100, // <= 100ms
    needsImprovement: 300, // <= 300ms
  },
  CLS: {
    good: 0.1, // <= 0.1
    needsImprovement: 0.25, // <= 0.25
  },
  INP: {
    good: 200, // <= 200ms
    needsImprovement: 500, // <= 500ms
  },
  TTFB: {
    good: 800, // <= 800ms
    needsImprovement: 1800, // <= 1800ms
  },
  FCP: {
    good: 1800, // <= 1.8s
    needsImprovement: 3000, // <= 3s
  },
} as const

/**
 * Rate a metric value according to Web Vitals thresholds
 */
export function rateMetric(
  name: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name]

  if (value <= thresholds.good) {
    return 'good'
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement'
  } else {
    return 'poor'
  }
}

/**
 * Custom hook to track Web Vitals in React components
 */
export function useWebVitals(config?: WebVitalsConfig) {
  if (typeof window === 'undefined') {
    return
  }

  // Initialize on mount
  if (typeof window !== 'undefined') {
    initWebVitals(config).catch((error) => {
      logger.warn('[Web Vitals] Failed to initialize', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }
}

/**
 * Report custom performance metrics
 */
export function reportCustomMetric(
  name: string,
  value: number,
  metadata?: Record<string, unknown>
) {
  if (typeof window === 'undefined') {
    return
  }

  // Create a metric-like object that matches the Metric interface
  const metric: Metric = {
    name,
    value,
    rating: value < 1000 ? 'good' : value < 2500 ? 'needs-improvement' : 'poor',
    delta: value,
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    navigationType: 'navigate' as const,
    entries: [],
    ...metadata,
  } as unknown as Metric

  // Send to analytics
  const endpoint = '/api/analytics/web-vitals'
  sendToAnalytics(endpoint, metric)

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[Custom Metric] ${name}`, { value, ...metadata })
  }
}

/**
 * Measure and report component render time
 */
export function measureRenderTime(componentName: string, renderTime: number) {
  reportCustomMetric(`render_${componentName}`, renderTime, {
    component: componentName,
    type: 'render',
  })
}

/**
 * Measure and report API call duration
 */
export function measureAPICall(endpoint: string, duration: number, status: number) {
  reportCustomMetric(`api_${endpoint.replace(/\//g, '_')}`, duration, {
    endpoint,
    status,
    type: 'api',
  })
}

/**
 * Measure and report database query duration
 */
export function measureDBQuery(queryName: string, duration: number) {
  reportCustomMetric(`db_${queryName}`, duration, {
    query: queryName,
    type: 'database',
  })
}
