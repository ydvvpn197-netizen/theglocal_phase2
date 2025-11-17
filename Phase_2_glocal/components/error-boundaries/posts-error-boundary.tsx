/**
 * Posts Feature Error Boundary
 *
 * Specialized error boundary for the posts/feed feature.
 * Provides contextual error messages and recovery options.
 */

'use client'

import { ReactNode } from 'react'
import { FeatureErrorBoundary } from './feature-error-boundary'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { WindowWithGtag } from '@/lib/types/window-extensions'

interface Props {
  children: ReactNode
  onError?: (error: Error) => void
}

export function PostsErrorBoundary({ children, onError }: Props) {
  const handleError = (error: Error, _errorInfo: React.ErrorInfo) => {
    // Send to analytics
    if (typeof window !== 'undefined') {
      const windowWithGtag = window as WindowWithGtag
      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', 'exception', {
          description: `Posts Error: ${error.message}`,
          fatal: false,
          feature: 'posts',
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
      <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Unable to load posts</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We're having trouble loading the feed right now. This might be due to a network issue or
        temporary problem.
      </p>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Reload Feed
        </Button>
        <Button onClick={() => (window.location.href = '/')} variant="ghost" size="sm">
          Go Home
        </Button>
      </div>
    </Card>
  )

  return (
    <FeatureErrorBoundary featureName="Posts" fallback={fallback} onError={handleError}>
      {children}
    </FeatureErrorBoundary>
  )
}
