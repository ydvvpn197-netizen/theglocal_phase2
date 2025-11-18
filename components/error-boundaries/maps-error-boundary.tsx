/**
 * Maps Feature Error Boundary
 *
 * Specialized error boundary for map components.
 * Handles Google Maps API errors and provides fallback UI.
 */

'use client'

import { ReactNode } from 'react'
import { FeatureErrorBoundary } from './feature-error-boundary'
import { MapPinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { WindowWithGtag } from '@/lib/types/window-extensions'

interface Props {
  children: ReactNode
  onError?: (error: Error) => void
  showFallbackList?: boolean
  fallbackContent?: ReactNode
}

export function MapsErrorBoundary({
  children,
  onError,
  showFallbackList = false,
  fallbackContent,
}: Props) {
  const handleError = (error: Error, _errorInfo: React.ErrorInfo) => {
    // Send to analytics
    if (typeof window !== 'undefined') {
      const windowWithGtag = window as WindowWithGtag
      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', 'exception', {
          description: `Maps Error: ${error.message}`,
          fatal: false,
          feature: 'maps',
        })
      }
    }

    // Call custom handler
    if (onError) {
      onError(error)
    }
  }

  const fallback = (
    <Card className="p-6 text-center bg-muted/30">
      <MapPinOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Map unavailable</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We&apos;re unable to load the map right now. This might be due to a connection issue or
        temporary problem with the mapping service.
      </p>
      {showFallbackList && fallbackContent && <div className="mt-4">{fallbackContent}</div>}
      <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="mt-4">
        Retry
      </Button>
    </Card>
  )

  return (
    <FeatureErrorBoundary featureName="Maps" fallback={fallback} onError={handleError}>
      {children}
    </FeatureErrorBoundary>
  )
}
