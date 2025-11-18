/**
 * Window Extensions Type Definitions
 *
 * Shared type definitions for browser window extensions used across the application.
 * These types extend the global Window interface for third-party libraries.
 */

interface GtagFunction {
  (command: string, targetId: string, config?: Record<string, unknown>): void
}

type AdSenseByGoogle = Array<Record<string, unknown>>

interface Sentry {
  captureException: (
    error: Error,
    context?: {
      contexts?: { react?: React.ErrorInfo }
      extra?: Record<string, unknown>
    }
  ) => void
  addBreadcrumb?: (breadcrumb: {
    category: string
    message: string
    level: 'warning' | 'info' | 'error'
    data?: Record<string, unknown>
  }) => void
}

declare global {
  interface Window {
    gtag?: GtagFunction
    adsbygoogle?: AdSenseByGoogle
    Sentry?: Sentry
  }
}

export type WindowWithGtag = Window & {
  gtag?: GtagFunction
}

export type WindowWithAdsense = Window & {
  adsbygoogle?: AdSenseByGoogle
}

export type WindowWithSentry = Window & {
  Sentry?: Sentry
}
