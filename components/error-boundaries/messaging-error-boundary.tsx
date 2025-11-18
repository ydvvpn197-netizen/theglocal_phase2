/**
 * Messaging Feature Error Boundary
 *
 * Specialized error boundary for the messaging/conversations feature.
 * Provides contextual error messages and recovery options.
 */

'use client'

import { ReactNode } from 'react'
import { FeatureErrorBoundary } from './feature-error-boundary'
import { MessageCircleOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { WindowWithGtag } from '@/lib/types/window-extensions'

interface Props {
  children: ReactNode
  onError?: (error: Error) => void
}

export function MessagingErrorBoundary({ children, onError }: Props) {
  const handleError = (error: Error, _errorInfo: React.ErrorInfo) => {
    // Send to analytics
    if (typeof window !== 'undefined') {
      const windowWithGtag = window as WindowWithGtag
      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', 'exception', {
          description: `Messaging Error: ${error.message}`,
          fatal: false,
          feature: 'messaging',
        })
      }
    }

    // Call custom handler
    if (onError) {
      onError(error)
    }
  }

  const fallback = (
    <Card className="p-6 text-center">
      <MessageCircleOff className="mx-auto mb-4 h-12 w-12 text-destructive opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Unable to load messages</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We&apos;re having trouble loading your messages right now. Your messages are safe and this
        is likely a temporary issue.
      </p>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Reload Messages
        </Button>
        <Button onClick={() => (window.location.href = '/')} variant="ghost" size="sm">
          Go Home
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        If this problem persists, please contact support.
      </p>
    </Card>
  )

  return (
    <FeatureErrorBoundary featureName="Messaging" fallback={fallback} onError={handleError}>
      {children}
    </FeatureErrorBoundary>
  )
}
